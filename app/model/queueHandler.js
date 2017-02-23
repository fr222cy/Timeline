const util = require('util');

    function QueueHandler() {
        this.clients = [];
        this.maxClients = 2;
    }

    QueueHandler.prototype.addUser = function(object) {
        this.clients.push(object);
    };

    QueueHandler.prototype.removeUser = function(socketId) {
        var index = this.clients.indexOf(this.getUser(socketId));
        if(index > -1)
            this.clients.splice(index, 1);   
    };

    QueueHandler.prototype.clear = function(){
        this.clients = [];
    }

    QueueHandler.prototype.getUser = function(socketId) {
        var userToreturn;

        this.clients.forEach(function(user) {
            if(user.socketId === socketId)
                userToreturn = user;
        });
        return userToreturn;
    };

    QueueHandler.prototype.updateUser = function(customId, newSocketId){
        this.clients.forEach(function(user) {
        if(user.customId === customId)
           user.socketId = newSocketId;
        });
    }

    QueueHandler.prototype.pop = function() {   
        if(this.clients.length > 0){
            return this.clients.pop(); 
        }   
    };

    QueueHandler.prototype.getAllUsersInQueue = function() {
        var users = [];
        this.clients.forEach(function(element){
            users.push(element.name);
        });
        return users;
    };

    QueueHandler.prototype.getAmountOfUsers = function() {
        return this.clients.length;
    };

    QueueHandler.prototype.getUsersLeftForStart = function() {
        return this.maxClients - this.clients.length;
    };  

    QueueHandler.prototype.getMaxPlayers = function() {
        return this.maxClients;
    }

    QueueHandler.prototype.getClients = function() {
        return this.clients;
    }
    
module.exports = QueueHandler;