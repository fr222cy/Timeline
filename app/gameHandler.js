var Player = require('./model/Player.js');

module.exports = function(app, io){

    var Queue = require("./model/queue.js");
    var queue = new Queue();
    var GameRoom = require('./model/gameRoom.js');
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
                                      socket.id,
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
        /*
        |---------------------|
        |--Player game Events-| 
        |---------------------|
        */
        socket.on('joinRoom', function(data) {
            socket.join(data.room);
            console.log("socket joined room: " + data.room);
            getRoomById(data.room).verifyPlayer(socket, data.userId);
        });

        socket.on('validateCardDrop', function(data, callback){
            if(getRoomById(data.roomId).validateDrop(data)){
                callback(true);
            }else{
                callback(false);
            }
        });

        socket.on('nextTurn', function(data){   
             getRoomById(data.roomId).nextTurn();
        });

        socket.on('newMessage', function(data){
            getRoomById(data.roomId).sendMessage(data);
        });

        socket.on('cardMovement', function(data){
            getRoomById(data.roomId).sendCardMovement(data);
        })

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
            io.emit("gameReady", {roomId: roomId, players: getPlayersInQueueHTML()} );
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
    //Current solution for fetching a room. CHANGE THIS
    function getRoomById(roomId){
     return gameRooms.filter(function( obj ) {
        return obj.getRoomId() === roomId;
    })[0];
}
}

  