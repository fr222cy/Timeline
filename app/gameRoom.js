var Card = require('./model/card.js');
var cardSchema = require('./model/cardSchema.js');
var userSchema = require('./model/user.js');

class GameRoom {
	constructor(roomId, players, io, gameOverCallback) {
		this.roomId = roomId;
		this.players = players;
		this.io = io;
		this.timeLimit = 40; //seconds
		this.round = 1;
		this.turn = 0;
		this.refreshTime = 1000;//ms
		this.waitTimer = null;
		this.turnTimer = null;
		this.cardPile = [];
		this.usedCards = [];
		this.usedIndexes = [];
		this.InitializeGame();
		this.report();
		this.waitBeforeStart();
		this.gameOverCallback = gameOverCallback;
		this.playersHaveAllCards = [];
		this.lastRound = false;
	}

	InitializeGame() {
		var self = this;
		this.players.forEach(function (player) {
			var client = player.socket;
			client.join(self.roomId);
			self.updatePlayerStatistics(player.userId, "ADD_PLAYED");
			// Give player a random reference card.
			self.getRandomCard(function (card) {
				card.lock();
				card.isDropped = true;
				self.addCardToSlot(5, card, player, function (couldAddCard) {

				});
			});

			/*
				|--Sockets--|
			*/
			//Data     -> slotNum, userId, cardId
			//Movecard -> next(isValidDrop, isCardLocked, cardYear, isCardDropped)
			client.on('moveCard', function (data, next) {
				var oldCards = self.players[self.turn].cards.slice(0);
				var card = self.getCardById(data.cardId);

				self.isValidDrop(data, card, function (isValid) {
					if (isValid) {
						client.broadcast.to(self.roomId).emit("cardMovement", { cardId: data.cardId, slot: data.slotNum, success: true });
						next(true, null, card.year, card.isDropped);
						card.isDropped = true;
						var cards = self.players[self.turn].cards.slice(0);
						cards = cards.filter(self.removeEmptySlots);
						if (cards.length == 10) {
							self.playersHaveAllCards.push(self.players[self.turn]);
							self.lastRound = true;
							client.broadcast.to(self.roomId).emit("notification", { message: "LAST ROUND! " + self.players[self.turn].name + " has 10 cards locked! " })
							self.nextTurn(2000);
						}
					}
					else {
						if (!card.isLocked) {
							client.broadcast.to(self.roomId).emit("cardMovement", { cardId: data.cardId, slot: data.slotNum, success: false });
							next(false, false, card.year, card.isDropped);
							self.nextTurn(2000);
						}
						else {
							next(false, true, null, card.isDropped);
							self.players[self.turn].cards = oldCards;
						}
					}
				});
			});

			client.on('getCard', function (data, next) {
				self.isUsersTurn(data.userId, function (isUserTurn) {

					if (isUserTurn) {
						client.broadcast.to(self.roomId).emit("notification", { message: self.players[self.turn].name + " took a card!" })
						self.getRandomCard(function (card) {

							client.broadcast.to(self.roomId).emit("newCard", { card: card })
							self.startCountdown();
							var year = card.year;
							card.year = "?";
							next(card);
							card.year = year;
						});
					}
				});
			});

			client.on('nextTurn', function (data) {
				self.isUsersTurn(data.userId, function (isUserTurn) {
					if (isUserTurn) {
						client.broadcast.to(self.roomId).emit("notification", { message: self.players[self.turn].name + " locked the timeline!", lock: true });
						self.nextTurn(3000);
					}
				});
			});

			client.on('newMessage', function (data) {
				self.sendMessage(data);
			});

			client.on('disconnect', function () {
				client.broadcast.to(self.roomId).emit("notification", { message: player.name + " has left the game!" });
				if (self.players.length <= 2) {
					self.gameOver("NO_MORE_PLAYERS");
					return;
				}
				self.isUsersTurn(player.userId, function (isUserTurn) {
					self.players.splice(self.players.indexOf(player), 1)

					if (isUserTurn) {
						if (self.turn + 1 > self.players.length - 1) {
							self.round++;
							self.turn = 0;
						} else {
							self.turn++;
						}
						self.newTurn();
					}
				});
			});
		});
	}

	waitBeforeStart() {
		var self = this;
		setTimeout(function () {
			self.notifyPlayers("Please wait for the game to start...");
			self.notifyPlayers("Game started!");
			self.newTurn();
		}, 7000);
	}

	getRoomId() {
		return this.roomId;
	}

	getRegisteredPlayers() {
		return this.players;
	}

	getRandomCard(next) {
		var self = this;
		cardSchema.count().exec(function (err, count) {
			for (var i = 0; i < count; i++) {
				var random = Math.floor(Math.random() * count)
				if (i === count - 1) {
					next(new Card(1, "Unfortunently, there are no more cards", 1234));
				}
				if (self.usedIndexes.indexOf(random) === -1) {
					break;
				}
			}
			cardSchema.findOne().skip(random).exec(function (err, cardData) {
				var card = new Card(cardData._id, cardData.description, cardData.year);
				self.usedIndexes.push(random); //temporary solution. (prevents duplicate cards). 
				self.usedCards.push(card);
				next(card);
			});
		});
	}

	getCardById(id) {
		for (var i = 0; i < this.usedCards.length; i++) {
			if (this.usedCards[i].id == id) {
				return this.usedCards[i];
			}
		}
	}

	newTurn() {
		var self = this;
		//TODO: Handle first round specificly
		this.players.forEach(function (player) {
			//The player whos turn it is
			if (self.players[self.turn] == player) {
				self.io.to(player.socket.id).emit("notification", { message: "It's your turn" });
				self.io.to(player.socket.id).emit("turn", {
					round: self.round,
					playersCards: player.cards,
					isPlayersTurn: true
				});
			} else {
				self.io.to(player.socket.id).emit("notification", { message: "It's " + self.players[self.turn].name + "'s Turn!" });
				self.io.to(player.socket.id).emit("turn", {
					round: self.round,
					nameOfTurn: self.players[self.turn].name,
					cards: self.players[self.turn].cards,
					isPlayersTurn: false
				});
			}
		});
		this.startCountdown();
	}

	startCountdown() {
		var self = this;
		clearInterval(self.turnTimer);
		var timeleft = this.timeLimit;

		this.io.to(this.roomId).emit('updateCountdown', {
			timeLimit: timeleft
		});

		this.turnTimer = setInterval(function () {

			if (timeleft === 0) {
				self.io.to(self.players[self.turn].socket.id).emit("forceNextTurn");
				self.nextTurn(3000);
				self.notifyPlayers("Time ran out! Switching to next player")
				clearInterval(self.turnTimer);
			} else {
				timeleft--;
			}
		}, 1000);
	}

	sendMessage(data) {
		var filteredMessage = data.message.replace(/[|&;$%@"<>()+,]/g, "");
		this.io.to(this.roomId).emit('message', {
			sender: data.sender.split(' ').slice(0, -1).join(' '),//removes lastname
			message: filteredMessage
		});
	};

	addCardToSlot(slotNum, card, player, next) {
		if (player != null) {//exists first round only
			var cards = player.cards;
		} else {
			var cards = this.players[this.turn].cards;
		}
		slotNum--; // fit with array index
		if (cards[slotNum] === 0 || cards[slotNum] === null || cards[slotNum] === card) { //Ensure no cards are in the slot
			if (cards.includes(card)) { // if cards already exists
				cards[cards.indexOf(card)] = 0;
				cards[slotNum] = card;
			} else {
				cards[slotNum] = card;
			}
			next(true);
		} else {
			next(false);
		}
	}

	removeUnlockedCards() {
		var cards = this.players[this.turn].cards;
		for (var i = 0; i < cards.length; i++) {
			if (cards[i] !== 0) {
				if (!cards[i].isLocked) {
					cards[i] = 0;
				}
			}
		}
	}

	isValidDrop(data, card, next) {
		var self = this;
		this.isUsersTurn(data.userId, function (isUserTurn) {
			if (!isUserTurn) {
				next(false);
				return;
			}
			console.log("Before adding:" + self.players[self.turn].cards);
			self.addCardToSlot(data.slotNum, card, null, function (couldAddCard) {
				if (!couldAddCard) {
					next(false);
					return;
				}
				console.log("After adding:" + self.players[self.turn].cards);
				var cards = self.players[self.turn].cards.slice(0);
				var cards = cards.filter(self.removeEmptySlots)

				if (cards.length === 1) {
					next(true); //First drop.
					return;
				}
				//Validate if all cards are in order by year.
				console.log("filtered:" + cards);
				for (var i = 0; i <= cards.length; i++) {
					if (cards[i + 1] == null) {
						next(true);
						return;
					}
					var current = cards[i];
				
					var nextCard = cards[i + 1];
					console.log(nextCard.year);

					if (current.year > nextCard.year) {
						self.removeUnlockedCards();
						next(false);
						return;
					}
				};
				next(true);

			});
		});
	}

	removeEmptySlots(slot) {
		return slot != null && slot != 0;
	}

	nextTurn(delay) {
		var cards = this.players[this.turn].cards;
		cards.forEach(function (card) {
			if (card !== 0) {
				card.isLocked = true;
			}
		});
		var self = this;
		clearInterval(this.turnTimer);
		setTimeout(function () {
			if (self.turn + 1 > self.players.length - 1) {

				if(self.lastRound) {
					var temp = 0;
					self.playersHaveAllCards.forEach( function(player){
						temp++;
					})
					if(temp > 1) {
						self.gameOver("GAME_DRAW");
					}else {
						self.gameOver("GAME_WON");
					}
					return;
				}

				self.round++;
				self.turn = 0;
			} else {
				self.turn++;
			}

			self.newTurn();
		}, delay);
	};

	notifyPlayers(message) {
		this.io.to(this.roomId).emit('message', {
			sender: "Server",
			message: message
		});
	}

	report() {
		console.log("|NEW GAME STARTED|")
		console.log("|----------------|")
		console.log("|Players: " + this.players.length + "      |")
		console.log("|ROOMID:" + this.roomId + "  |");
		console.log("|----------------|");
	}

	isUsersTurn(userId, next) {
		next(userId == this.players[this.turn].userId);
	}

	gameOver(reason) {
		var self = this;
		clearInterval(this.turnTimer);
		var winnerNames = "";
		switch (reason) {
			case "GAME_WON":
				this.updatePlayerStatistics(this.playersHaveAllCards[0].userId, "ADD_WIN");
				winnerNames += "\n"+this.playersHaveAllCards[0].name;
				break;
			case "GAME_DRAW":
				this.playersHaveAllCards.forEach( function(player){
					self.updatePlayerStatistics(player.userId, "ADD_DRAWED");
					winnerNames += "\n"+player.name;
				});
				break;
			case "NO_MORE_PLAYERS":
				this.updatePlayerStatistics(this.players[0].userId, "ADD_WIN");
				break;
			case "NO_MORE_CARDS":
				break;
		}

		this.io.to(this.roomId).emit("gameOver", { reason: reason, winners: winnerNames})

		
		this.gameOverCallback(this);

		setTimeout( function() {
			self.io.to(self.roomId).emit("redirectToLobby");
		},10000)	
	}

	updatePlayerStatistics(userId, reason) {
		userSchema.findOne({_id: userId}, function (err, user) {
			console.error("Found user with id");
			console.log(user);
			switch(reason) {
				case "ADD_PLAYED":
						if(user.played == null ) {
							user.played = 0;	
						}
						user.played++
					break;
				case "ADD_DRAW":
						if(user.drawed == null ) {
							user.drawed = 0;
						}
						user.drawed++
					break;
				case "ADD_WIN":
						if(user.wins == null ) {
							user.wins = 0;
						}
						user.wins++;
					break;
			}
			user.save(function (err) {
					if(err) {
							console.error('ERROR!');
					}
				});
		});
	}
		
}
module.exports = GameRoom;
























