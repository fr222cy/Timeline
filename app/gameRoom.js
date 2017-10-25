let Card = require('./domain/card.js');
let cardSchema = require('./dao/cardSchema.js');
let userSchema = require('./dao/user.js');
let updatePlayerStatistics = require('./dbProcs/updatePlayerStatistics.js')
let EloHandler = require('./misc/eloHandler.js');
let async = require('async');

class GameRoom {
	constructor(roomId, activePlayers, io, gameOverCallback) {
		this.roomId = roomId;
		this.activePlayers = activePlayers;
		this.initialAmountOfPlayers;
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
		this.isGameOver = false;
		this.eloHandler;
	}

	InitializeGame() {
		this.eloHandler = new EloHandler(this.activePlayers);
		this.initialAmountOfPlayers = this.activePlayers.length;
		this.activePlayers.forEach((player) => {
			let client = player.socket;
			client.join(this.roomId);
			updatePlayerStatistics(player.userId, "ADD_PLAYED");
			// Give player a random reference card.
			this.getRandomCard((card) => {
				card.lock();
				card.isDropped = true;
				this.addCardToSlot(5, card, player, (couldAddCard) => {
				});
			});

			/*
				|--Sockets--|
			*/
			//Data     -> slotNum, userId, cardId
			//Movecard -> next(isValidDrop, isCardLocked, cardYear, isCardDropped)
			client.on('moveCard', (data, next) => {
				let oldCards = this.getPlayerPropertyByIndex(this.turn,'cards').slice(0);
				let card = this.getCardById(data.cardId);

				this.isValidDrop(data, card, (isValid) => {
					if (isValid) {
						client.broadcast.to(this.roomId).emit("cardMovement", { cardId: data.cardId, slot: data.slotNum, success: true });
						next(true, null, card.year, card.isDropped);
						card.isDropped = true;
						let cards = this.getPlayerPropertyByIndex(this.turn,'cards').slice(0);
						cards = cards.filter(this.removeEmptySlots);
						if (cards.length == 10) {
							this.playersHaveAllCards.push(this.getPlayerByIndex(this.turn));
							this.lastRound = true;
							client.broadcast.to(this.roomId).emit("notification", { message: "LAST ROUND! " + this.getPlayerPropertyByIndex(this.turn,'name') + " has 10 cards locked! " })
							this.nextTurn(3500);
						}
					}
					else {
						if (!card.isLocked) {
							client.broadcast.to(this.roomId).emit("cardMovement", { cardId: data.cardId, slot: data.slotNum, success: false });
							next(false, false, card.year, card.isDropped);
							this.nextTurn(3500);
						}
						else {
							next(false, true, null, card.isDropped);
							this.getPlayerPropertyByIndex(this.turn,'cards') = oldCards;
						}
					}
				});
			});

			client.on('getCard', (data, next) => {
				this.isUsersTurn(data.userId, (isUserTurn) => {

					if (isUserTurn) {
						client.broadcast.to(this.roomId).emit("notification", { message: this.getPlayerPropertyByIndex(this.turn, 'name')+ " took a card!" })
						this.getRandomCard( (card) => {

							client.broadcast.to(this.roomId).emit("newCard", { card: card })
							this.startCountdown();
							let year = card.year;
							card.year = "?";
							next(card);
							card.year = year;
						});
					}
				});
			});

			client.on('nextTurn', (data) =>  {
				this.isUsersTurn(data.userId, (isUserTurn) => {
					if (isUserTurn) {
						client.broadcast.to(this.roomId).emit("notification", { message: this.getPlayerPropertyByIndex(this.turn,'name') + " locked the timeline!", lock: true });
						this.nextTurn(3000);
					}
				});
			});

			client.on('newMessage', (data) => {
				this.sendMessage(data);
			});

			client.on('disconnect', () => {
					console.log("ACTIVE PLAYERS BEFORE LEAVE = " + this.activePlayers.length);
				client.broadcast.to(this.roomId).emit("notification", { message: player.name + " has left the game!" });

				this.isUsersTurn(player.userId, (isUserTurn) => {
					this.eloHandler.addPlaceToPlayer(player.userId, this.activePlayers.length + 1);

					console.log("ACTIVE PLAYERS AFTER LEAVE = " + this.activePlayers.length);
					if (this.activePlayers.length === 1) {
						this.gameOver("NO_MORE_PLAYERS");
						return;
					}
					if (this.activePlayers.length === 0) {
						return;
					}
					
					if (isUserTurn) {
						if (this.turn + 1 > this.activePlayers.length - 1) {
							this.round++;
							this.turn = 0;
						} else {
							this.turn++;
						}
						this.newTurn();
					}		
				});
			});
		});
	}

	waitBeforeStart() {
		setTimeout( () => {
			this.notifyPlayers("Game started!");
			this.newTurn();
		}, 7000);
	}

	getRoomId() {
		return this.roomId;
	}

	getRegisteredPlayers() {
		return this.activePlayers;
	}

	getRandomCard(next) {
		let random;
		cardSchema.count().exec( (err, count) => {
			for (let i = 0; i < count; i++) {
			  random = Math.floor(Math.random() * count)
				if (i === count - 1) {
					next(new Card(1, "Unfortunently, there are no more cards", 1234));
				}
				if (this.usedIndexes.indexOf(random) === -1) {
					break;
				}
			}
			cardSchema.findOne().skip(random).exec( (err, cardData) => {
				let card = new Card(cardData._id, cardData.description, cardData.year);
				this.usedIndexes.push(random); //temporary solution. (prevents duplicate cards). 
				this.usedCards.push(card);
				next(card);
			});
		});
	}

	getCardById(id) {
		for (let i = 0; i < this.usedCards.length; i++) {
			if (this.usedCards[i].id == id) {
				return this.usedCards[i];
			}
		}
	}

	newTurn() {
		this.activePlayers.forEach( (player) => {
			//The player whos turn it is
			if (this.getPlayerByIndex(this.turn) == player) {
				this.io.to(player.socket.id).emit("notification", { message: "It's your turn" });
				this.io.to(player.socket.id).emit("turn", {
					round: this.round,
					playersCards: player.cards,
					isPlayersTurn: true
				});
			} else {
				this.io.to(player.socket.id).emit("notification", { message: "It's " + this.activePlayers[this.turn].name + "'s Turn!" });
				this.io.to(player.socket.id).emit("turn", {
					round: this.round,
					nameOfTurn: this.activePlayers[this.turn].name,
					cards: this.activePlayers[this.turn].cards,
					isPlayersTurn: false
				});
			}
		});
		this.startCountdown();
	}

	startCountdown() {
		clearInterval(this.turnTimer);
		let timeleft = this.timeLimit;

		this.io.to(this.roomId).emit('updateCountdown', {
			timeLimit: timeleft
		});

		this.turnTimer = setInterval( () => {

			if (timeleft === 0) {
				if(this.activePlayers.length <= 0) {
					this.gameOver("EMPTY_ROOM");
				}
				this.io.to(this.getPlayerPropertyByIndex(this.turn,'socket').id).emit("forceNextTurn");
				this.nextTurn(3000);
				this.notifyPlayers("Time ran out! Switching to next player")
				clearInterval(this.turnTimer);
			} else {
				timeleft--;
			}
		}, 1000);
	}

	sendMessage(data) {
		let filteredMessage = data.message.replace(/[|&;$%@"<>()+,]/g, "");
		this.io.to(this.roomId).emit('message', {
			sender: data.sender,
			message: filteredMessage
		});
	};

	addCardToSlot(slotNum, card, player, next) {
		let cards;
		if (player != null) {//exists first round only
		 cards = player.cards;
		} else {
	 	 cards = this.getPlayerPropertyByIndex(this.turn, 'cards');
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
		let cards = this.getPlayerPropertyByIndex(this.turn,'cards');
		for (let i = 0; i < cards.length; i++) {
			if (cards[i] !== 0) {
				if (!cards[i].isLocked) {
					cards[i] = 0;
				}
			}
		}
	}

	isValidDrop(data, card, next) {
		this.isUsersTurn(data.userId, (isUserTurn) => {
			if (!isUserTurn) {
				next(false);
				return;
			}
			this.addCardToSlot(data.slotNum, card, null, (couldAddCard) => {
				if (!couldAddCard) {
					next(false);
					return;
				}
				let cards = this.getPlayerPropertyByIndex(this.turn,'cards').slice(0);
			  cards = cards.filter(this.removeEmptySlots)

				if (cards.length === 1) {
					next(true); //First drop.
					return;
				}
				//Validate if all cards are in order by year.
				for (let i = 0; i <= cards.length; i++) {
					if (cards[i + 1] == null) {
						next(true);
						return;
					}
					let current = Number(cards[i].year);
					let nextCard = Number(cards[i + 1].year);

					if (current > nextCard) {
						this.removeUnlockedCards();
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
		let cards = this.getPlayerPropertyByIndex(this.turn, 'cards');
		cards.forEach( (card) => {
			if (card !== 0) {
				card.isLocked = true;
			}
		});
		clearInterval(this.turnTimer);
		setTimeout( () => {
			if (this.turn + 1 > this.activePlayers.length - 1) {
				if (this.lastRound) {
					if (this.playersHaveAllCards.length > 1) {
						this.gameOver("GAME_DRAW");
					} else {
						this.gameOver("GAME_WON");
					}
					return;
				}
				this.round++;
				this.turn = 0;
			} else {
				this.turn++;
			}
			this.newTurn();
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
		console.log("|activePlayers: " + this.activePlayers.length + "      |")
		console.log("|ROOMID:" + this.roomId + "  |");
		console.log("|----------------|");
	}

	isUsersTurn(userId, next) {
		next(userId == this.getPlayerPropertyByIndex(this.turn,'userId'));
	}

	gameOver(reason) {
		clearInterval(this.turnTimer);
		if(!this.isGameOver) {
			this.isGameOver = true;
			let winnerNames = "";
			switch (reason) {
				case "GAME_WON":
					this.doEloUpdate();
					updatePlayerStatistics(this.getPlayersHaveAllCardsPropertyByIndex(0, 'userId'), "ADD_WIN");
					winnerNames += "\n" + this.getPlayersHaveAllCardsPropertyByIndex(0, 'name');
					
					break;
				case "GAME_DRAW":
					this.doEloUpdate();
					this.playersHaveAllCards.forEach( (player) => {
						updatePlayerStatistics(player.userId, "ADD_DRAW");
						winnerNames += "\n" + player.name;
					});
					
					break;
				case "NO_MORE_PLAYERS":
					if(this.activePlayers.length > 0) {
						this.doEloUpdate();
						updatePlayerStatistics(this.getPlayerPropertyByIndex(0, 'userId'), "ADD_WIN");
					}
					break;
				case "NO_MORE_CARDS":
					break;
				case "EMPTY_ROOM":
					break;
			}

			this.io.to(this.roomId).emit("gameOver", { reason: reason, winners: winnerNames })

			setTimeout( () => {
				this.io.to(this.roomId).emit("redirectToLobby");
				this.gameOverCallback(this);
			}, 7000)
		}
	}

	getPlayerPropertyByIndex(index, property) {
		if (this.activePlayers[index] != null) {
			return this.activePlayers[index][property]
		} else {
			console.log("ERR: Did not found player or property");
			return null;
		}
	}

	getPlayerByIndex(index) {
		if (this.activePlayers[index] != null) {
			return this.activePlayers[index]
		} else {
			console.log("ERR: Did not found player");
			return null;
		}
	}

	getPlayersHaveAllCardsPropertyByIndex(index, property) {
		if (this.playersHaveAllCards[index] != null) {
			return this.playersHaveAllCards[index][property];
		} else {
			console.log("ERR: Did not found player or property");
			return null;
		}
	}

	doEloUpdate() {
		let players = this.activePlayers.slice();
		let winningPlayers = this.playersHaveAllCards.slice();
		let eloPlayers = [];

		players.sort(this.compare);

		for(let i = 0; i < players.length ; i++) {
			this.containsObject(players[i], winningPlayers, (isWinner) =>  {
				if(isWinner) {
					this.eloHandler.addPlaceToPlayer(players[i].userId, 1);
				}else {
					this.eloHandler.addPlaceToPlayer(players[i].userId, i+1);
				}
			});
		}
		this.eloHandler.calculateElo();
	}

  containsObject(obj, arr, next) {
    let i;
    for (i = 0; i < arr.length; i++) {
        if (arr[i] === obj) {
            next(true);
						return;
        }
    }
    next(false);
	}

  compare(a, b) {
  const cardsA = a.cards.length;
  const cardsB = b.cards.length;

  let comparison = 0;
  if (cardsA > cardsB) {
    comparison = 1;
  } else if (cardsA < cardsB) {
    comparison = -1;
  }
  return comparison;
}
}
module.exports = GameRoom;
























