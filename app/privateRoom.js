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
    this.players.push(player);
   
    player.socket.join(this.roomId);

    player.socket.on('disconnect', () => {
      this.players.splice(this.players.indexOf(player), 1)
      this.updatePlayerInRoomList(); 
      if (this.players.length === 0) {
        this.callback(this);
      }
    });
  
    this.updatePlayerInRoomList();
    cb(true);
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
    
  }

  //HTML-string for printing current players in queue.

  updatePlayerInRoomList() {
    var players = this.players;
    var tableHtml = "<table id=privateRoomList class='bordered'>";
    tableHtml += "<tr> <th> Name </th> <th> Rating </th> </tr>";
    players.forEach(function(player, index) {
      if(index == 0) { //leader
         tableHtml += "<tr> <td>" +player.name+ " (Leader) </td> <td> N/A </td> </tr>";
      }else {
        tableHtml += "<tr> <td>" +player.name+ " </td> <td> N/A </td> </tr>";
      }
    });
    tableHtml += "</table>";
    
    this.io.to(this.roomId).emit('updatePlayerList', {
			tableHtml : tableHtml
		});
  }
}
module.exports = PrivateRoom;