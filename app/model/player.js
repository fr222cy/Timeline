var Player = function(userId, socketId, name){
    this.userId = userId;
    this.socketId = socketId;
    this.name = name;
}

module.exports = Player;