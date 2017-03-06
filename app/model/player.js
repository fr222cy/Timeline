var Player = function(userId, socketId, name){
    this.userId = userId;
    this.socketId = socketId;
    this.name = name;
    this.ready = 0;
    this.cards = [0,1,2,3,4,5,6,7,8,9]
}

module.exports = Player;