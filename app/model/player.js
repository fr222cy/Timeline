var Player = function(userId, socket, name){
    this.userId = userId;
    this.socket = socket;
    this.name = name;
    this.ready = 0;
    this.cards = [];
}

module.exports = Player;