function GameRoom(roomId, players, io){
    this.roomId = roomId;
    this.players = players;
    this.io = io;
    this.gameStates = {
        Waiting: 0,
        Running: 1,
        Stopped: 2 
    }    
    this.timeLimit = 30; //seconds
    this.round = 1;
    this.turn = 0;
    this.refreshTime = 1000;//ms
    this.waitTimer = null;
    this.turnTimer = null;
    this.report();
    this.waitForPlayers();
}

GameRoom.prototype.getRoomId = function(){
    return this.roomId;
}

GameRoom.prototype.getRegisteredPlayers = function(){
    return this.players;
}

GameRoom.prototype.waitForPlayers = function(){
   
    var self = this;
    this.notifyPlayers("Waiting for all players to connect...")
    this.waitTimer = setInterval(function(){
         clearInterval(self.waitTimer);
        var count = 0;
        self.players.forEach(function(player){
            if(player.ready === 1){
                count++;
            }
        });
        if(count === self.players.length){          
            self.notifyPlayers("All players connected!");
            self.notifyPlayers("Starting game!");
            self.newTurn();            
        }
       
    },this.refreshTime);
}

GameRoom.prototype.newTurn = function(){
    var self = this;
    this.io.emit(this.roomId,{
        round: this.round,
        turn : this.players[this.turn],
        timelimit : this.timelimit
    });

    var timeleft = this.timeLimit
    this.turnTimer = setInterval(function() {
            if(self.timeLimit/2 === timeleft){
                self.notifyPlayers(self.players[self.turn].name +"! You have " +timeleft + " seconds to lock!")
            }

            if (timeleft === 0) {    
            self.io.emit(self.roomId+'/'+self.players[self.turn].userId+'/forceNextTurn');
            clearInterval(self.turnInterval);     
            }else {
                timeleft--;
            }
     }, 1000);
}

GameRoom.prototype.verifyPlayer = function(socket, userId){
    this.players.forEach(function(player){
        if(player.userId === userId){
            player.ready = 1;
            console.log(player.name + " is ready")
        }
    });  
}

GameRoom.prototype.sendMessage = function(data){
    date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();

    this.io.emit(this.roomId+'/message',{
        time : hours+":"+minutes+":"+seconds,
        sender : data.sender.split(' ').slice(0, -1).join(' '),//removes lastname
        message : data.message
    });
    
}

GameRoom.prototype.nextTurn = function(){
    clearInterval(this.turnTimer);
    if(this.turn + 1 > this.players.length - 1){
        this.round++;
        this.turn = 0;
    }else{    
        this.turn++;
    }   
    this.newTurn();
}

GameRoom.prototype.notifyPlayers = function(message){
    date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();

    this.io.emit(this.roomId+'/message',{
        time : hours+":"+minutes+":"+seconds,
        sender : "Server",
        message : message
    });
}

GameRoom.prototype.report = function(){
    console.log("|NEW GAME STARTED|")
    console.log("|----------------|")
    console.log("|Players: "+this.players.length+"      |")
    console.log("|ROOMID:"+this.roomId+"  |");
    console.log("|----------------|");
}

module.exports = GameRoom;
