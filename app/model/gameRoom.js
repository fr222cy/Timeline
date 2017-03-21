var Card = require('./card.js');

function GameRoom(roomId, players, io){
    this.roomId = roomId;
    this.players = players;
    this.io = io; 
    this.timeLimit = 90; //seconds
    this.round = 1;
    this.turn = 0;
    this.refreshTime = 1000;//ms
    this.waitTimer = null;
    this.turnTimer = null;
    this.report();
    this.waitForPlayers();
    this.cardPile = [];
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
    var timeleft = this.timeLimit
    var card = this.getRandomCard();

    //TODO: Handle first round specificly
    console.log(card);

     this.players.forEach(function(player){
        //The player whos turn it is
        if(self.players[self.turn] == player){
            self.io.emit(self.roomId+"/"+player.userId,{
                round: self.round,
                player : self.players[self.turn],
                time : timeleft,
                card : card,
                isPlayersTurn : true
            });
        }else{
           self.io.emit(self.roomId+"/"+player.userId,{
                round: self.round,
                nameOfTurn : self.players[self.turn].name,
                cards : self.players[self.turn].cards,
                time : timeleft,
                card : card,
                isPlayersTurn : false
            }); 
        }   
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

GameRoom.prototype.sendCardMovement = function(data){
    this.io.emit(this.roomId+"/cardMovement", {x: data.x, y: data.y})
}

GameRoom.prototype.validateDrop = function(data){
    if(data.userId == this.players[this.turn].userId){
        return true;
    }else{
        return false;
    }

};

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

GameRoom.prototype.getRandomCard = function(){
    //If someone SOMEHOW see this particular commit
    //Dont judge my historical knowledge! 
    //This is just for testing.
    this.cardPile.push(new Card("WW2 started", 1939, 1));
    this.cardPile.push(new Card("New York was founded", 1634, 2));
    this.cardPile.push(new Card("Aftonbladet was founded", 1871, 3));
    this.cardPile.push(new Card("The world wide web was invented", 1991, 4));
    this.cardPile.push(new Card("Neil Armstrong took the first step on the moon", 1968, 5));
    this.cardPile.push(new Card("New Sweden was founded in Maryland", 1713, 6));
    this.cardPile.push(new Card("Hitler Died", 1945, 7));
    this.cardPile.push(new Card("Joseph stalin was born", 1889, 8));
    this.cardPile.push(new Card("Swedish house mafia had a global hit with the song One", 1939, 9));

    return this.cardPile[Math.floor(Math.random() * this.cardPile.length)];

}

module.exports = GameRoom;
