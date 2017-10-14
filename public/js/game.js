"use strict";
	var inGame = false;
	var socket;
	var users;
	var id;
	var name;
	var sendDragInterval;
	var isDragging = false;
	var opponentCardPosY;
	var opponentCardPosX;
	var timeLeftInterval;



	/*
			|--Game Section--|
	*/
	function gameState(data, _socket, _id, _name, startedFrom) {
		socket = _socket;
		id = _id;
		name = _name;
		/*
				|--Clickables--|
		*/
		$("#nextTurnButton").click(function () {
			stopTurnCountdown();
			socket.emit('nextTurn', { userId: id })
			disableChoice();
			animateLockingCards();
		});

		$("#getCardButton").click(function () {
			var category = $(this).attr("id");
			socket.emit("getCard",
				{
					userId: id,
					category: category
				}
				, function (card) {
					generateCard(card, true)
					disableChoice();
				});
		});


		/*
				|--Sockets--|
		*/
		socket.off('onCreated');
		socket.off('updatePlayerList');
		socket.off('queue');
		socket.off('gameReady');

		socket.on("turn", function (data) {
			unblockUserInterface();
			$('#getCardButton').attr('disabled', 'disabled');
			removeCards();
			$("#round").html("Round: " + data.round);
			if (data.isPlayersTurn) {
				enableChoice();
				$("#turn").html("Its your turn");
				generateCardDropZone(data.playersCards, true);
			} else {
				$("#turn").html("You are watching " + data.nameOfTurn);
				disableChoice();
				generateCardDropZone(data.cards, false);
			}
		});

		socket.on("cardMovement", function (data) {
			var options = {
				"my": "top left",
				"at": "top left",
				"of": "#" + data.slot,
				using: function (pos) {
					if (data.success) {
						$(this).addClass("correct");
						animateSuccess($(this), pos);
					} else {
						animateFailure($(this), pos);
					}
				}
			};
			$("#" + data.cardId).position(options);
		});

		socket.on('updateCountdown', function (data) {
			startTurnCountdown(data.timeLimit);
		})

		socket.on("newCard", function (data) {
			generateCard(data.card, false)
		});

		socket.on("forceNextTurn", function (data) {
			disableChoice();
			clearInterval(timeLeftInterval);
			animateLockingCards();
		});

		socket.on("notification", function (data) {
			$("<h5>" + data.message + "</h5>")
				.attr('id', 'message')
				.appendTo("#notificationArea")
				.hide()
				.show("slide", { direction: "left" }, 1000, function () {
					$(this).fadeOut(2000, function () {
						$(this).remove();
					});
				});

			if (data.lock != null) {
				animateLockingCards();
				stopTurnCountdown();
			}
		});

		socket.on("gameOver", function (data) {
			stopTurnCountdown();
			disableChoice();
			animateLockingCards();
			
			var gameOverTitle = "";
			var gameOverDesc = "";

			switch(data.reason) {
			case "GAME_WON":
				gameOverTitle = "WE HAVE A WINNER!";
				gameOverDesc = data.winners + " has won the game! Congratulations!"  ;
				break;
			case "GAME_DRAW":
				gameOverTitle = "WE HAVE A DRAW!";
				gameOverDesc = "The draw is between: ";
				gameOverDesc += data.winners;
				break;
			case "NO_MORE_PLAYERS":
				gameOverTitle = "YOU HAVE WON!";
				gameOverDesc = "There are no more players in the room!";
				break;
			case "NO_MORE_CARDS":
				gameOverTitle = "NO MORE CARDS!";
				gameOverDesc = "This is embarrasing...\n Feel free to contribute and submit more cards!";
				break;
			}
			blockUserInterfaceWithTitleAndMessage(gameOverTitle, gameOverDesc);
		});

		socket.on("redirectToLobby", function (data) {
			window.location.href = "/lobby";
		});

		$("#info").html("Quitting now gives a temporary ban");
		$("#inqueue").html(data.players)
		$("#leaveQueueButton").hide(1000);
		changeToGameView(startedFrom);
	}

	/*
			|--Chat--|
	*/

	function chat() {
		socket.on('message', function (data) {
			if (data.message) {
				$("#gameChatArea ul").append('<li>' + data.sender + ': ' + data.message + '</li>');
				var chatarea = $("#gameChatArea");
				chatarea.scrollTop(chatarea.prop('scrollHeight'));
			} else {
				console.log("Something went wrong:", data);
			}
		});

		$("#gameChatInput").keyup(function (e) {
			if (e.keyCode == 13) {
				var text = $("#gameChatInput").val();
				if (text) {
					socket.emit('newMessage', { message: text, sender: name });
					$("#gameChatInput").val("");
				}
			}
		});
	}


	/*
			|--Cards and slots--|
	*/
	function generateCardDropZone(cards, isPlayersTurn) {
		var dragOptions = {
			containment: '#gameArea',
			cursor: 'move',
			revert: true,
			start: function () {
				$(this).data("origPosition", $(this).position())
			}
		};

		for (var i = 1; i <= 10; i++) {
			$('<div class="slot">  </div>').attr('id', i).appendTo('#cardSlots').droppable({
				accept: '#cardPile div, #cardSlots div',
				hoverClass: 'hovered',
				drop: validateDrop
			});
			var card = cards[i - 1];
			if (card !== 0) {
				var visualCard = $('<div class="card"><span id="cardYear">' + card.year + '</span><span id="cardDesc">' + card.description + '</span> </div>')
					.attr('id', card.id)
					.appendTo('#' + i)
					.data("isLocked", true)

				if (isPlayersTurn) {
					visualCard.draggable(dragOptions);
				}
			}
		}
	}

	function generateCard(card, isPlayersTurn) {
		console.log(card);
		var dragOptions = {
			containment: '#gameArea',
			stack: '#cardPile div',
			cursor: 'move',
			revert: true,
			start: function () {
				$(this).data("origPosition", $(this).position())
			}
		};


		var visualCard = $('<div class="card"><span id="cardYear">' + card.year + '</span><span id="cardDesc">' + card.description + '</span> </div>')
			.attr('id', card.id).appendTo('#cardPile')

		if (isPlayersTurn) {
			visualCard.draggable(dragOptions);
		} else {
			visualCard.data("origPosition", visualCard.position());
		}

		$("#cardDesc").textfill({
			minFontPixels: 4,
			maxFontPixels: 100
		});
	}

	function validateDrop(event, ui) {
		var draggedOptions = {
			containment: '#cardSlots',
			cursor: 'move',
			revert: true,
			start: function () {
				$(this).data("origPosition", $(this).position())
			}
		};


		var slotNumber = $(this).attr("id");
		var cardId = ui.draggable.attr("id");
		var draggedCard = ui.draggable;
		var self = this;
		draggedCard.draggable('option', 'revert', false);

		socket.emit('moveCard', {
			slotNum: slotNumber,
			userId: id,
			cardId: cardId
		}, function (isValid, cardAlreadyLocked, year, isCardLocked) { //Callback
			if (isValid) {
				draggedCard.draggable(draggedOptions);
				draggedCard.find("#cardYear").html(year)


				//draggedCard.data("slotNum", slotNumber.replace("slot", ""));
				if (!isCardLocked) {
					enableChoice();
				}

				draggedCard.addClass('correct')
				draggedCard.addClass('dropped');
				//ui.draggable.draggable( 'disable' );
				//$(self).droppable( 'disable' );
				draggedCard.position({ of: $(self), my: 'left top', at: 'left top' });
				animateSuccess(draggedCard, null);
			} else {

				if (cardAlreadyLocked) {
					revertLockedCard(draggedCard)
				} else {
					draggedCard.find("#cardYear").html(year)
					disableChoice();
					animateFailure(draggedCard, null);
				}
			}
		});
	}

	/*
			|--Animations--|
	*/
	function revertLockedCard(cardObject) {
		cardObject.animate(cardObject.data("origPosition"));
	}

	function removeCards() {
		$(".card").remove();
		$("#cardSlots").empty();
	}

	function animateFailure(cardObject, pos) {

		if (pos == null) { // if current players turn (ugly)
			$(".card").each(function () {
				var card = $(this);
				if (!card.data("isLocked")) {
					card.css({ "backgroundColor": "#ff5722 " })
					card.fadeOut(500, function () {
						card.remove();
					});
				}
			});
		} else {
			cardObject.animate(pos, 1000, "swing", function () {
				$(".card").each(function () {
					var card = $(this);
					if (!card.data("isLocked")) {
						card.css({ "backgroundColor": "#ff5722 " })
						card.fadeOut(500, function () {
							card.remove();
						});
					}
				});

				cardObject.css({ "backgroundColor": "#ff5722 " })
			}).animate({ top: -5 + "%" }, 1000, "swing", function () {
				cardObject.remove();
			});
		}
	}

	function animateSuccess(cardObject, pos) {

		if (pos == null) {//If current players turn
			if (!cardObject.data("isLocked")) {
				cardObject.css({ "backgroundColor": "yellow" })
			}
		} else {//If opponent turn
			cardObject.animate(pos, 1000, "swing", function () {
				if (!cardObject.data("isLocked")) {
					cardObject.css({ "backgroundColor": "yellow" })
				}
			});
		}
	}

	function animateLockingCards() {
		$(".card").each(function () {

			$(this).animate({
				backgroundColor: "#8bc34a",
				color: "#fff",
				width: 500
			}, 1000);

		});
	}

	function changeToGameView(startedFrom) {
		var i = 2;
		var myInterval = setInterval(function () {
			
			$("#waitNotification").html("All here! starting in " + i + " seconds");
			if (i === 0) {
				//Hide the queueDiv and show the Gamearea  
				if(startedFrom === "QUEUE") {
					$("#queueDiv").hide(500, function () {
						$("#gameArea").show(300);
						blockUserInterfaceWithMessage("Waiting for other players to load...");
						$("#queueDiv").css("display", "none");
					});
				}
				else if(startedFrom === "PRIVATE_GAME") {
					$("#privateRoomContainer").hide(500, function () {
					$("#gameArea").show(300);
					blockUserInterfaceWithMessage("Waiting for other players to load...");
					$("#privateRoomContainer").css("display", "none");
				});
				}
				
				clearInterval(myInterval);
			} else {
				i--;
			}
		}, 1000);
	}

	function startTurnCountdown(timelimit) {
		clearInterval(timeLeftInterval);
		var progressbar = $("#progressbar"),
			progressLabel = $(".progress-label");
		var timeleft = timelimit;
		console.log(timelimit);

		timeLeftInterval = setInterval(function () {
			timeleft -= 0.1;
			var percentageLeft = (timeleft / timelimit) * 100;
			$(".determinate").css({ 'width': percentageLeft + '%' });
			$("#progressTime").html(Math.round(timeleft));
			if (timeleft == 0) {

			}
		}, 100);
	};

	function stopTurnCountdown() {
		clearInterval(timeLeftInterval)
	}

	function enableChoice() {
		$('#getCardButton').removeAttr('disabled');
		$('#getCardButton').show();
		$("#nextTurnButton").show();
	}

	function disableChoice() {
		$('#getCardButton').attr('disabled', 'disabled');
		$('#getCardButton').hide();
		$("#nextTurnButton").hide();
	}

	function blockUserInterfaceWithMessage(message) {
		$.blockUI({
			message: '<p> ' + message + '</p>',
			css: {
				border: 'none',
				padding: '15px',
				width: '20%',
				height: '10%',
				backgroundColor: '#000',
				'-webkit-border-radius': '10px',
				'-moz-border-radius': '10px',
				opacity: .5,
				color: '#fff'
			}
		});
	}

	function unblockUserInterface() {
		$.unblockUI();
	}

	function blockUserInterfaceWithTitleAndMessage(title, message) {
		$.blockUI({
			message: '<h3>'  + title + ' </h3><br><span>' + message + '</span><br><p>You will be redirected to the lobby shortly...</p> ',
			css: {
				border: 'none',
				padding: '15px',
				width: '40%',
				height: '30%',
				backgroundColor: '#000',
				'-webkit-border-radius': '10px',
				'-moz-border-radius': '10px',
				opacity: .5,
				color: '#fff'
			}
		});
}




