function GameRoom(roomId, players, io){
    this.roomId = roomId;
    this.players = players;
    this.activeSockets = [];
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
    this.refreshTime = 3000;
}



GameRoom.prototype.getRoomId = function(){
    return this.roomId;
}

GameRoom.prototype.getRegisteredPlayers = function(){
    return this.players;
}

GameRoom.prototype.addActivePlayer = function(socket){
    this.activeSockets.push(socket);

    if(this.activeSockets.length >= this.players.length){
        this.startGame();
    }
}

GameRoom.prototype.startGame = function(){
    var that = this;
    console.log("STARTED GAME: " + this.roomId);
    setInterval(function(){   
        that.sendGameData();
        
        
        that.gameTime+=(this.refreshTime/1000);
    }, this.refreshTime);
}





GameRoom.prototype.sendGameData = function(){
    this.io.emit(this.roomId,{
        round: this.round,
        turn : "Filip",
        gameTime : this.gameTime
        });
}

module.exports = GameRoom;
