var Player = require('./domain/player.js');

/*
|---------------------------------------------------------------------------------|
This script handles the matchmaking and private rooms.
When a matchmaking has reached a full queue (4 atm), start game is called.
Same goes for private rooms, but the private room leader manually starts the game.

Listening on  
->"createNewGame" - called when a user enters /game?create_private
->"joinGame" - called when a user types and submits a roomId /game?join_private 
->"startPrivateGame" - called when the private room leader presses start
->"queueJoin" - called when a user enters /game?match_making
|----------------------------------------------------------------------------------|
*/

const util = require('util');
module.exports = function(app, io){

	var Queue = require("./queue.js");
	var queue = new Queue(4);
	var GameRoom = require('./gameRoom.js');
	var PrivateRoom = require = require('./privateRoom.js');
	var gameRooms = [];
	var privateRooms = []
	
	io.on('connection', function(socket){   
		
		socket.on('createNewGame', function (data) {
      var roomId = generateRandomID(); 
      var newPlayer = new Player(data.userId,
									  socket,
									  data.name);

      room = new PrivateRoom(roomId, io, function(privateRoom) {//Cb when game is over
			privateRooms.splice(privateRooms.indexOf(privateRoom), 1)	
			})
      room.addPlayer(newPlayer, function (isValid){
				if(isValid) {
					io.to(socket.id).emit('onCreated', {roomId : roomId});
				}
			});
      privateRooms.push(room);
		});
		
		socket.on('joinGame', function (data, next) {
			var roomToJoin = getPrivateRoomById(data.roomId)
			if(roomToJoin != null) {
				var newPlayer = new Player(data.userId,
									  socket,
									  data.name);
				roomToJoin.addPlayer(newPlayer, function(isValid) {
					if(isValid) {
						next(null, true)
					}
					else {
						next("Can't join the room since it's full (8/8 players)")
					}
				});
			}else {
				next("Can't find room with id: " + data.roomId);
			}
		});

		socket.on('startPrivateGame', function (data) {
			var roomToStart = getPrivateRoomById(data.roomId);
			if(roomToStart != null) {
				roomToStart.startGame(data.userId, function(isValid, players, roomId){
					if(isValid) {
						io.to(roomId).emit("gameReady", {players: getPlayersInGameHTML(players)});
						startNewGame(players, roomId);
					}
				});
			}else {
				//Notify leader game couldnt be started
			}
		});

		socket.on('queueJoin', function (data) {

			if(!isPlayerAlreadyInQueue(data.userId)){
			   
				var newPlayer = new Player(data.userId,
									  socket,
									  data.name);
				queue.addPlayer(newPlayer);    
				queue.updatePlayer(data.userId, socket.id);
				notifyQueue();
			}else{
				queue.updatePlayer(data.userId, socket.id);
				notifyQueue();
			}

			if(queue.getAmountOfPlayers() >= queue.getMaxPlayers()){
				startNewGame( queue.getClients(), generateRandomID());
				io.emit("gameReady", {players: getPlayersInGameHTML(queue.getAllPlayersInQueue())});
				queue.clear();
			}
		});
		  
		socket.on('disconnect', function(){
			console.log("Socket to be removed: "+ socket.id);
			queue.removePlayer(socket.id); 
			console.log("Players in queue->"+queue.getAmountOfPlayers());
			notifyQueue();
		});
		//Triggered when a queue is full.
		function startNewGame(players, roomId){
    			
			try {
				gameRooms.push(new GameRoom(roomId,players, io, function(gameRoom){// CB -> Game is over
					console.log("Amount of gameRooms before deletion: " + gameRooms.length )
					gameRooms.splice(gameRooms.indexOf(gameRoom),1)
					console.log("Amount of gameRooms after deletion: " + gameRooms.length )
				})); 
			}catch(err){
				console.log("ERROR IN ROOM");
				console.log(err);
			}			
		}
		
		function notifyQueue(){
			io.emit("queue",{ 
			inQueue: getPlayersInGameHTML(queue.getAllPlayersInQueue()),
			totalInQueue: queue.getAmountOfPlayers(),
			maxPlayers: queue.getMaxPlayers()
			});
		}
	});

	function isPlayerAlreadyInQueue(userId) {
		var result = false;
		var clients = queue.getClients();
		if(clients == null)
			return false;

		clients.forEach(function(element) {
			if(element.userId == userId)
				result = true;      
		});
		return result;
	}
	//Random ID for gamerooms
	function generateRandomID()
	{
		var text = "";
		var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

		for( var i=0; i < 7; i++ )
			text += possible.charAt(Math.floor(Math.random() * possible.length));

		return text;
	}
	//HTML-string for printing current players in queue.
	function getPlayersInGameHTML(players){
		var playerInGameString = "";
		players.forEach(function(element, index , arr){
				playerInGameString += "<br>" + element;
		});
		return playerInGameString;
	}

	function getPrivateRoomById(roomId){
  	for (var i=0, iLen=privateRooms.length; i<iLen; i++) {
    if (privateRooms[i].getRoomId() == roomId) 
			return privateRooms[i];
  	}
		return null;
	}	

	function getPrivateRoomByPlayerId(userId) {
		for (var i=0, iLen=privateRooms.length; i<iLen; i++) {
    if (privateRooms[i].getPlayerById() == roomId) 
			return privateRooms[i];
  	}
		return null;
	}
} 


