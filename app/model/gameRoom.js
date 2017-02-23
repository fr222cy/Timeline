function GameRoom(roomId, players, io){
    this.roomId = roomId;
    this.players = players;
    this.activePlayers = [];
    this.io = io;
    this.gameStates = {
        Waiting: 0,
        Running: 1,
        Stopped: 2 
    }    
    this.gameState = 0;
    this.gameTime = 0;
}



GameRoom.prototype.getRoomId = function(){
    return this.roomId;
}

GameRoom.prototype.getRegisteredPlayers = function(){
    return this.players;
}

GameRoom.prototype.addActivePlayer = function(customId){
    this.activePlayers.push(customId);
    if(this.activePlayers >= this.players.length){
        this.startGame();
    }
}

GameRoom.prototype.startGame = function(){
    var that = this;
   
    setInterval(function(){
    that.sendMessageToRoom("You are in room:" + that.roomId);
    that.sendMessageToRoom("GameTime:" + that.gameTime);
    that.gameTime++;
   
}, 1000);
}



GameRoom.prototype.sendMessageToRoom = function(message){
    this.io.emit(this.roomId,{message: message});
}

module.exports = GameRoom;
