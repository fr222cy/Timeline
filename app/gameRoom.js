var Card = require('./model/card.js');
var cardSchema = require('./model/cardSchema.js');

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
	}

	InitializeGame() {
		var self = this;
		this.players.forEach(function (player) {
			var client = player.socket;
			client.join(self.roomId);

			// Give player a random reference card.
			self.getRandomCard(function (card) {
				card.lock();
				card.isDropped = true;
				self.addCardToSlot(5, card, player);
			});

			/*
				|--Sockets--|
			*/

			//Data     -> slotNum, userId, cardId
			//Movecard -> Callback(isValidDrop, isCardLocked, cardYear, isCardDropped)
			client.on('moveCard', function (data, callback) {
				var oldCards = self.players[self.turn].cards.slice(0);
				var card = self.getCardById(data.cardId);


				if (self.isValidDrop(data, card)) {
					client.broadcast.to(self.roomId).emit("cardMovement", { cardId: data.cardId, slot: data.slotNum, success: true });
					callback(true, null, card.year, card.isDropped);
					card.isDropped = true;
	
					var cards = self.players[self.turn].cards.slice(0);
					cards = cards.filter(self.removeEmptySlots)
					if(cards.length >= 10) {
						self.gameOver("WON");
					}

				} else {
					if (!card.isLocked) {
						client.broadcast.to(self.roomId).emit("cardMovement", { cardId: data.cardId, slot: data.slotNum, success: false });
						callback(false, false, card.year, card.isDropped);
						self.nextTurn(2000);
					} else {
						callback(false, true, null, card.isDropped);
						self.players[self.turn].cards = oldCards;
					}
				}

			});

			client.on('getCard', function (data, callback) {
				self.isUsersTurn(data.userId, function (isUserTurn) {
					if (isUserTurn) {
						client.broadcast.to(self.roomId).emit("notification", { message: self.players[self.turn].name + " took a card!" })
						self.getRandomCard(function (card) {
							client.broadcast.to(self.roomId).emit("newCard", { card: card })
							self.startCountdown();
							var year = card.year;
							card.year = "?";
							callback(card);
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
				if(self.players.length <= 2) {
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

	getRandomCard(callback) {
		var self = this;
		cardSchema.count().exec(function (err, count) {
			for (var i = 0; i < count; i++) {
				var random = Math.floor(Math.random() * count)
				if (i === count - 1) {
					callback(new Card(1, "Unfortunently, there are no more cards", 1234));
				}
				if (self.usedIndexes.indexOf(random) === -1) {
					break;
				}
			}
			cardSchema.findOne().skip(random).exec(function (err, cardData) {
				var card = new Card(cardData._id, cardData.description, cardData.year);
				self.usedIndexes.push(random); //temporary solution. (prevents duplicate cards). 
				self.usedCards.push(card);
				callback(card);
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
		this.io.to(this.roomId).emit('message', {
			sender: data.sender.split(' ').slice(0, -1).join(' '),//removes lastname
			message: data.message
		});
	};

	addCardToSlot(slotNum, card, player) { 
		if (player != null) {//exists first round only
			var cards = player.cards;
		} else {
			var cards = this.players[this.turn].cards;
		}
		slotNum--; // fit with array index
		if (cards[slotNum] === 0 || cards[slotNum] === null) { //Ensure no cards are in the slot
			if (cards.includes(card)) { // if cards already exists
				cards[cards.indexOf(card)] = 0;
				cards[slotNum] = card;
			} else {
				cards[slotNum] = card;
			}
			return true;
		} else {
			return false;
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

	isValidDrop(data, card) {
		this.isUsersTurn(data.userId, function (isUserTurn) {
			if (isUserTurn) {
				return false;
			}
		});

		if (!this.addCardToSlot(data.slotNum, card)) {
			return false;
		}

		var cards = this.players[this.turn].cards.slice(0);


		var cards = cards.filter(this.removeEmptySlots)

		if (cards.length === 1) {
			return true; //First drop.
		}

		//Validate if all cards are in order by year.
		for (var i = 0; i <= cards.length; i++) {
			if (cards[i + 1] == null) {
				return true;
			}
			var current = cards[i];
			var next = cards[i + 1];

			if (current.year > next.year) {
				this.removeUnlockedCards();
				return false;
			}
		};
		return true;
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

	isUsersTurn(userId, callback) {
		callback(userId == this.players[this.turn].userId);
	}

	gameOver(reason) {
		clearInterval(this.turnTimer);
		this.gameOverCallback(this);

		switch(reason) {
			case "WON":
				
				break;
			
			case "DRAW":
				//TODO: Implement draw
				break;
			case "NO_MORE_PLAYERS":
				break;
		}
		
		this.io.to(this.roomId).emit("redirectToLobby")
		
	}

	displayWin() {

	}

}
module.exports = GameRoom;
























