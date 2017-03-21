var Player = function(userId, socketId, name){
    this.userId = userId;
    this.socketId = socketId;
    this.name = name;
    this.ready = 0;
    this.cards = [];
}

module.exports = Player;