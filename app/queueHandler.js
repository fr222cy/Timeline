var Player = require('./model/Player.js');

module.exports = function(app, io, callback){

    var Queue = require("./model/queue.js");
    var queue = new Queue();
    var gameStarting = false;

    io.on('connection', function(socket){   
        
        socket.on('storeClientInfo', function (data) {
            if(!isPlayerAlreadyInQueue(data.userId)){
                var newPlayer = new Player(data.userId,
                                      socket.id,
                                      data.name);

                queue.addPlayer(newPlayer);    
                notify();
            }else{
                queue.updatePlayer(data.userId, socket.id);
                notify();
            }

            if(queue.getAmountOfPlayers() >= queue.getMaxPlayers()){
                startNewGame();
            }
          
        });

        socket.on('disconnect', function(){
            console.log("Socket to be removed: "+ socket.id);
            queue.removePlayer(socket.id); 
            notify();
        });

        function startNewGame(){
            var randomId = generateRandomID();
            callback(randomId, queue.getClients());
            var urlString = "/game/"+randomId;
            io.emit("gameReady", {url: urlString} );
            notify();
            queue.clear();
        }

        function notify(){
            playerInQueueString = "Players in queue: ";
            queue.getAllPlayersInQueue().forEach(function(element, index , arr){
                playerInQueueString += "<br>" + element;
            });
           
            io.emit("queue",{ 
            inQueue: playerInQueueString,
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

    function generateRandomID()
    {
        var text = "";
        var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

        for( var i=0; i < 7; i++ )
            text += possible.charAt(Math.floor(Math.random() * possible.length));

        return text;
    }
}

  