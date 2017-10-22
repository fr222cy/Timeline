var getPlayerElo = require('./dbProcs/getPlayerElo.js');

class PrivateRoom {
  constructor(roomId, io, callback) {
		this.roomId = roomId;
		this.players = [];
		this.io = io;
    this.maxPlayers = 8;
    this.callback = callback;
	}

  addPlayer(player,cb) {
    if(this.players.length >= this.maxPlayers) {
      cb(false);
    }

    player.socket.join(this.roomId);

    player.socket.on('disconnect', () => {
      this.players.splice(this.players.indexOf(player), 1)
      this.updatePlayerInRoomList(); 
      if (this.players.length === 0) {
        this.callback(this);
      }
    });

    this.getPlayerEloDb(player.userId,(elo) => {
      player.rating = elo;
      this.players.push(player);
      this.updatePlayerInRoomList();
      cb(true);
    })
  }

  getPlayerEloDb(userId, next) {
    getPlayerElo(userId, function(err, elo) {
      if(err) {
        next("N/A");
        return;
      }
      next(elo);
    }); 
  }

  getPlayerByUserId(userId) {
    this.players.forEach(function(player) {
      if(player.userId === userId)
        playerToReturn = player;
    });
    return playerToReturn;
  }

  getRoomId() {
    return this.roomId;
  }

  startGame(userId, next) {
    if(this.players[0].userId !== userId) {
      next(false,null,null);
      return;
    }
    if(this.players.length < 2) {
      next(false,null,null)
      return;
    }
    next(true, this.players, this.roomId)
    this.callback(this);//remove private room
  }

  //HTML-string for printing current players in queue.

  updatePlayerInRoomList() {
    var players = this.players;
    var tableHtml = "<table id=privateRoomList class='bordered'>";
    tableHtml += "<tr> <th> Name </th> <th> Rating </th> </tr>";
    players.forEach(function(player, index) {
      if(index == 0) { //leader
         tableHtml += "<tr> <td>" +player.name+ " (Leader) </td> <td> "+player.rating+" </td> </tr>";
      }else {
        tableHtml += "<tr> <td>" +player.name+ " </td> <td> "+player.rating+" </td> </tr>";
      }
    });
    tableHtml += "</table>";
    
    this.io.to(this.roomId).emit('updatePlayerList', {
			tableHtml : tableHtml
		});
  }  
}
module.exports = PrivateRoom;