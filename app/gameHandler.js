var Game = function(){}
var gameRoom = require('./model/gameRoom.js');
var rooms = [];
var players = 0;

Game.prototype.running = function(app, io){
    var that = this;
    this.io = io;
    io.on('connection', function(socket){   
        players++;   
        socket.on('initialize', function(data){   
                 
            socket.join(data.roomId, function(){
                that.getRoomById(data.roomId).updateSocket();
            });        
        });

        socket.on('nextTurn', function(data){   
             that.getRoomById(data.roomId).nextTurn()
        });
      
        socket.on('disconnect', function(){
            players--;
            console.log("Socket to be removed: "+ socket.id);
        });
    });
}

Game.prototype.newGame = function(roomId, players){
    rooms.push(new gameRoom(roomId, players, this.io));
}
    
Game.prototype.isAuthorized = function(userId, roomId){
    var result = false;
    if(roomId != null && userId != null){
        var room = this.getRoomById(roomId);
        if(room != null){
            var players = room.getRegisteredPlayers();
            players.forEach(function(player){
                console.log(player.userId);
                if(player.userId == userId){
                    result = true;
                }
            });
        return result;
        }
    }
    io.emit("disconnectUser", { message: "Something went wrong"}); 
}

Game.prototype.getRoomById = function(roomId){
     return rooms.filter(function( obj ) {
        return obj.getRoomId() === roomId;
    })[0];
}

Game.prototype.getAmountOfPlayers = function(){
    return players;
}



module.exports = Game;


