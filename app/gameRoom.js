var Card = require('./domain/card.js');
var cardSchema = require('./dao/cardSchema.js');
var userSchema = require('./dao/user.js');
var async = require('async');

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
				var oldCards = self.getPlayerPropertyByIndex(self.turn,'cards').slice(0);
				var card = self.getCardById(data.cardId);

				self.isValidDrop(data, card, function (isValid) {
					if (isValid) {
						client.broadcast.to(self.roomId).emit("cardMovement", { cardId: data.cardId, slot: data.slotNum, success: true });
						next(true, null, card.year, card.isDropped);
						card.isDropped = true;
						var cards = self.getPlayerPropertyByIndex(self.turn,'cards').slice(0);
						cards = cards.filter(self.removeEmptySlots);
						if (cards.length == 10) {
							self.playersHaveAllCards.push(self.getPlayerByIndex(self.turn));
							self.lastRound = true;
							client.broadcast.to(self.roomId).emit("notification", { message: "LAST ROUND! " + self.getPlayerPropertyByIndex(self.turn,'name') + " has 10 cards locked! " })
							self.nextTurn(3500);
						}
					}
					else {
						if (!card.isLocked) {
							client.broadcast.to(self.roomId).emit("cardMovement", { cardId: data.cardId, slot: data.slotNum, success: false });
							next(false, false, card.year, card.isDropped);
							self.nextTurn(3500);
						}
						else {
							next(false, true, null, card.isDropped);
							self.getPlayerPropertyByIndex(self.turn,'cards') = oldCards;
						}
					}
				});
			});

			client.on('getCard', function (data, next) {
				self.isUsersTurn(data.userId, function (isUserTurn) {

					if (isUserTurn) {
						client.broadcast.to(self.roomId).emit("notification", { message: self.getPlayerPropertyByIndex(self.turn, 'name')+ " took a card!" })
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
						client.broadcast.to(self.roomId).emit("notification", { message: self.getPlayerPropertyByIndex(self.turn,'name') + " locked the timeline!", lock: true });
						self.nextTurn(3000);
					}
				});
			});

			client.on('newMessage', function (data) {
				self.sendMessage(data);
			});

			client.on('disconnect', function () {
				console.log("SOMEONE DISCONNECTED")
				client.broadcast.to(self.roomId).emit("notification", { message: player.name + " has left the game!" });

				self.isUsersTurn(player.userId, function (isUserTurn) {
					self.players.splice(self.players.indexOf(player), 1)
					if (self.players.length === 1) {
						self.gameOver("NO_MORE_PLAYERS");
						return;
					}
					if (self.players.length === 0) {
						return;
					}
					

					console.log("PLAYERS LENGTH BEFORE : " + self.players.length)
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
		this.players.forEach(function (player) {
			//The player whos turn it is
			if (self.getPlayerByIndex(self.turn) == player) {
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
			if(self.players.length <= 0) {
				self.gameOver("EMPTY_ROOM");
			}
			if (timeleft === 0) {
				console.log("Room id:" + self.roomId)
				console.log("INSIDE COUNTDOWN : PLAYERS ->" + self.players.length)
				self.io.to(self.getPlayerPropertyByIndex(self.turn,'socket').id).emit("forceNextTurn");
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
			var cards = this.getPlayerPropertyByIndex(this.turn, 'cards');
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
		var cards = this.getPlayerPropertyByIndex(this.turn,'cards');
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
			self.addCardToSlot(data.slotNum, card, null, function (couldAddCard) {
				if (!couldAddCard) {
					next(false);
					return;
				}
				var cards = self.getPlayerPropertyByIndex(self.turn,'cards').slice(0);
				var cards = cards.filter(self.removeEmptySlots)

				if (cards.length === 1) {
					next(true); //First drop.
					return;
				}
				//Validate if all cards are in order by year.
				for (var i = 0; i <= cards.length; i++) {
					if (cards[i + 1] == null) {
						next(true);
						return;
					}
					var current = Number(cards[i].year);
					var nextCard = Number(cards[i + 1].year);

					if (current > nextCard) {
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
		var cards = this.getPlayerPropertyByIndex(this.turn, 'cards');
		cards.forEach(function (card) {
			if (card !== 0) {
				card.isLocked = true;
			}
		});
		var self = this;
		clearInterval(this.turnTimer);
		setTimeout(function () {
			if (self.turn + 1 > self.players.length - 1) {
				if (self.lastRound) {
					if (self.playersHaveAllCards.length > 1) {
						self.gameOver("GAME_DRAW");
					} else {
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
		next(userId == this.getPlayerPropertyByIndex(this.turn,'userId'));
	}

	gameOver(reason) {
		console.log(reason);
		var self = this;
		clearInterval(this.turnTimer);
		
		var winnerNames = "";

		switch (reason) {
			case "GAME_WON":
				this.updatePlayerStatistics(this.getPlayersHaveAllCardsPropertyByIndex(0, 'userId'), "ADD_WIN");
				winnerNames += "\n" + this.getPlayersHaveAllCardsPropertyByIndex(0, 'name');
				break;
			case "GAME_DRAW":
				this.playersHaveAllCards.forEach(function (player) {
					console.log("PLAYER IN DRAWARRAY ->" + player.name)
					self.updatePlayerStatistics(player.userId, "ADD_DRAW");
					winnerNames += "\n" + player.name;
				});
				break;
			case "NO_MORE_PLAYERS":
				if(this.players.length > 0) {
					this.updatePlayerStatistics(this.getPlayerPropertyByIndex(0, 'userId'), "ADD_WIN");
				}
				break;
			case "NO_MORE_CARDS":
				break;
			case "EMPTY_ROOM":
				break;
		}

		this.io.to(this.roomId).emit("gameOver", { reason: reason, winners: winnerNames })

		console.log("SETTING TIMEOUT")
		setTimeout(function () {
			self.io.to(self.roomId).emit("redirectToLobby");
			self.gameOverCallback(self);
		}, 7000)
	}

	getPlayerPropertyByIndex(index, property) {
		if (this.players[index] != null) {
			console.log("GetPlayerProperty->RETURNING:" + this.players[index][property])
			return this.players[index][property]
		} else {
			console.log("ERR: Did not found player or property");
			return null;
		}
	}

	getPlayerByIndex(index) {
		if (this.players[index] != null) {
			return this.players[index]
		} else {
			console.log("ERR: Did not found player");
			return null;
		}
	}

	getPlayersHaveAllCardsPropertyByIndex(index, property) {
		if (this.playersHaveAllCards[index] != null) {
			console.log("Allcards->RETURNING:" + this.playersHaveAllCards[index][property])
			return this.playersHaveAllCards[index][property];
		} else {
			console.log("ERR: Did not found player or property");
			return null;
		}
	}

	updatePlayerStatistics(userId, reason) {
		userSchema.findOne({ _id: userId }, function (err, user) {
			switch (reason) {
				case "ADD_PLAYED":
					console.log("Adding played to " + user.displayname);
					if (user.played == null) {
						user.played = 0;
					}
					user.played++
					break;
				case "ADD_DRAW":
					console.log("Adding drawed to " + user.displayname);
					if (user.drawed == null) {
						user.drawed = 0;
					}
					user.drawed++
					break;
				case "ADD_WIN":
					console.log("Adding win to " + user.displayname);
					if (user.wins == null) {
						user.wins = 0;
					}
					user.wins++;
					break;
			}
			user.save(function (err) {
				if (err) {
					console.error('ERROR!');
				}
			});
		});
	}
}
module.exports = GameRoom;
























