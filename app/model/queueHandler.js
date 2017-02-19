const util = require('util');

    function QueueHandler() {
        this.clients = [];
        this.maxClients = 3;
    }

    QueueHandler.prototype.addUser = function(object) {
        this.clients.push(object);
    };

    QueueHandler.prototype.removeUser = function(socketId) {
        console.log("Username on index 0: " + this.clients[0].name);
        console.log("Username on index 1: " + this.clients[1].name);
        console.log("Ska ta bort "+this.getUser(socketId).name+" på index "+this.clients.indexOf(this.getUser(socketId)));
        //var deleted = this.clients.splice());  Fixa 
        console.log("Tog bort: " +  deleted);  
        console.log(util.inspect(deleted, {showHidden: false, depth: null}));
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