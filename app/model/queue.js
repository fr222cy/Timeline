const util = require('util');

    function Queue() {
        this.clients = [];
        this.maxClients = 2;
    }

    Queue.prototype.addPlayer = function(object) {
        this.clients.push(object);
    };

    Queue.prototype.removePlayer = function(socketId) {
        var index = this.clients.indexOf(this.getPlayer(socketId));
        if(index > -1)
            this.clients.splice(index, 1);   
    };

    Queue.prototype.clear = function(){
        this.clients = [];
    }

    Queue.prototype.getPlayer = function(socketId) {
        var playerToreturn;

        this.clients.forEach(function(player) {
            if(player.socketId === socketId)
                playerToreturn = player;
        });
        return playerToreturn;
    };

    Queue.prototype.updatePlayer = function(userId, newSocketId){
        this.clients.forEach(function(player) {
        if(player.userId === userId)
           player.socketId = newSocketId;
        });
    }

    Queue.prototype.pop = function() {   
        if(this.clients.length > 0){
            return this.clients.pop(); 
        }   
    };

    Queue.prototype.getAllPlayersInQueue = function() {
        var players = [];
        this.clients.forEach(function(element){
            players.push(element.name);
        });
        return players;
    };

    Queue.prototype.getAmountOfPlayers = function() {
        return this.clients.length;
    };

    Queue.prototype.getPlayersLeftForStart = function() {
        return this.maxClients - this.clients.length;
    };  

    Queue.prototype.getMaxPlayers = function() {
        return this.maxClients;
    }

    Queue.prototype.getClients = function() {
        return this.clients;
    }
    
module.exports = Queue;