function PokerRoom(gameId, players){
    this.gameId = gameId;
    this.players = players;
}

PokerRoom.prototype.getGameId = function(){
    return this.gameId;
}

PokerRoom.prototype.getPlayers = function(){
    return this.players;
}


module.exports = PokerRoom;