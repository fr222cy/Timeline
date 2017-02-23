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
                that.getRoomById(data.roomId).addActivePlayer(socket);
            });        
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
    
Game.prototype.isAuthorized = function(customId, roomId){
    var result = false;
    if(roomId != null && customId != null){
        var room = this.getRoomById(roomId);
        if(room != null){
            var players = room.getRegisteredPlayers();
            players.forEach(function(player){
                console.log(player.customId);
                if(player.customId == customId){
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


