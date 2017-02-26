function GameRoom(roomId, players, io){
    this.roomId = roomId;
    this.players = players;
    this.io = io;
    this.gameStates = {
        Waiting: 0,
        Running: 1,
        Stopped: 2 
    }    
    this.gameState = 0;
    this.gameTime = 0;
    this.maxTurns = 100;
    this.round = 1;
    this.turn = 0;
    this.refreshTime = 1000;
    this.startGame();
}



GameRoom.prototype.getRoomId = function(){
    return this.roomId;
}

GameRoom.prototype.getRegisteredPlayers = function(){
    return this.players;
}

GameRoom.prototype.startGame = function(){
    var that = this;
    console.log("STARTED GAME: " + this.roomId);

    setInterval(function(){   
        that.sendGameData();
        that.gameTime+=that.refreshTime/1000;
    }, this.refreshTime);
}

GameRoom.prototype.sendGameData = function(){
    this.io.emit(this.roomId,{
        round: this.round,
        turn : this.players[this.turn],
        gameTime : this.gameTime
        });
}

GameRoom.prototype.updateSocket = function(socket, userId){
    this.players.forEach(function(player){
        if(player.userId === userId){
            player.socket = socket;
        }
    });
}

GameRoom.prototype.nextTurn = function(){
  
    if(this.turn + 1 > this.players.length - 1){
          console.log("SET TO 0");
        this.turn = 0;
    }else{
        console.log("SET TO " + this.turn);
        this.turn++;
    }
    
}

module.exports = GameRoom;
