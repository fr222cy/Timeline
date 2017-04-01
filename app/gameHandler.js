var Player = require('./model/Player.js');
const util = require('util');
module.exports = function(app, io){

    var Queue = require("./queue.js");
    var queue = new Queue();
    var GameRoom = require('./gameRoom.js');
    var gameRooms = [];
    var players = 0;
    

 
    io.on('connection', function(socket){   
        players++;  
        /*
        |---------------------|
        |----Queue Section----| 
        |---------------------|
        */
        socket.on('InitiliazeQueue', function (data) {

            if(!isPlayerAlreadyInQueue(data.userId)){
               
                var newPlayer = new Player(data.userId,
                                      socket,
                                      data.name);
                queue.addPlayer(newPlayer);    
                notifyQueue();
            }else{
                queue.updatePlayer(data.userId, socket.id);
                notifyQueue();
            }

            if(queue.getAmountOfPlayers() >= queue.getMaxPlayers()){
                startNewGame();
            }
        });
          
        socket.on('disconnect', function(){
            players--;
            console.log("Socket to be removed: "+ socket.id);
            queue.removePlayer(socket.id); 
            notifyQueue();
        });
        //Triggered when a queue is full.
        function startNewGame(){          
            var roomId = generateRandomID();  
            var playersInQueue = queue.getClients();

            gameRooms.push(new GameRoom(roomId,playersInQueue, io)) 
            io.emit("gameReady", {players: getPlayersInQueueHTML()} );
            queue.clear();
        }
        
        function notifyQueue(){
            io.emit("queue",{ 
            inQueue: getPlayersInQueueHTML(),
            totalInQueue: queue.getAmountOfPlayers(),
            maxPlayers: queue.getMaxPlayers()
            });
        }
    });

    function isPlayerAlreadyInQueue(userId) {
        var result = false;
        var clients = queue.getClients();
        if(clients == null)
            return false;

        clients.forEach(function(element) {
            if(element.userId == userId)
                result = true;      
        });
        return result;
    }
    //Random ID for gamerooms
    function generateRandomID()
    {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 7; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
    //HTML-string for printing current players in queue.
    function getPlayersInQueueHTML(){
        var playerInQueueString = "";
        queue.getAllPlayersInQueue().forEach(function(element, index , arr){
                playerInQueueString += "<br>" + element;
        });
        return playerInQueueString;
    }
}

  