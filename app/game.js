var Game = function(){}
var PokerRoom = require('./model/pokerRoom.js');
var pokerRooms = [];


Game.prototype.running = function(app, io){
    var that = this;
    io.on('connection', function(socket){   

        socket.on('initialize', function(data){
            if(that.isAuthorized(socket, data.customId, data.roomId)){
                socket.join(data.roomId, function(){
                    console.log(socket.rooms); // [ <socket.id>, 'room 237' ]
                    io.to(data.roomId, 'a new user has joined the room'); // broadcast to everyone in the room
                });
                console.log("Was Authorized");
            }else{
                console.log("Was NOT Authorized");
                //socket.disconnect();
            }
        });

        socket.on('disconnect', function(){
            console.log("Socket to be removed: "+ socket.id);
        });
    });
}

Game.prototype.newGame = function(roomId, players){
    pokerRooms.push(new PokerRoom(roomId, players));
}
    
Game.prototype.isAuthorized = function(socket, customId, roomId){
    console.log("ROOMID on server:" + roomId);
    var room = pokerRooms.filter(function( obj ) {
        return obj.getGameId() === roomId;
    })[0];
    console.log("ROOM on server:" + room);
    var players = room.getPlayers();
    var result = false;

    players.forEach(function(player){
        if(player.customId === customId){
            result = true;
        }
    });
    return result;
}



module.exports = Game;









    
