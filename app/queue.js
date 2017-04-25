const util = require('util');

class Queue {

constructor() {
    this.clients = [];
    this.maxClients = 1;
}

addPlayer(player) {
    this.clients.push(player);
};

removePlayer(socketId) {
    var index = this.clients.indexOf(this.getPlayer(socketId));
    if(index > -1)
        this.clients.splice(index, 1);   
};

clear() {
    this.clients = [];
};

getPlayer(socketId) {
    var playerToreturn;

    this.clients.forEach(function(player) {
        if(player.socketId === socketId)
            playerToreturn = player;
    });
    return playerToreturn;
};

updatePlayer(userId, newSocketId) {
    this.clients.forEach(function(player) {
    if(player.userId === userId)
        player.socketId = newSocketId;
    });
};

pop() {   
    if(this.clients.length > 0){
        return this.clients.pop(); 
    }   
};

getAllPlayersInQueue() {
    var players = [];
    this.clients.forEach(function(element){
        players.push(element.name);
    });
    return players;
};

getAmountOfPlayers() {
    return this.clients.length;
};

getPlayersLeftForStart() {
    return this.maxClients - this.clients.length;
};  

getMaxPlayers() {
    return this.maxClients;
};

getClients() {
    return this.clients;
}

}
module.exports = Queue;