var Card = require('./model/card.js');

class GameRoom{

constructor(roomId, players, io){
    this.roomId = roomId;
    this.players = players;
    this.io = io; 
    this.timeLimit = 120; //seconds
    this.round = 1;
    this.turn = 0;
    this.refreshTime = 1000;//ms
    this.waitTimer = null;
    this.turnTimer = null;
    this.cardPile = [];
    this.InitializeSockets();
    this.report();
    this.waitBeforeStart();
}   

InitializeSockets() {
    var self = this;
    this.players.forEach(function(player) {
        var client = player.socket;
        client.join(self.roomId);
     
        client.on('validateCardDrop', function(data, callback) {
            if(self.validateDrop(data)) {
                client.broadcast.to(self.roomId).emit("cardMovement", {slot: data.slotnum, success: true});
                callback(true);
            }else{
                client.broadcast.to(self.roomId).emit("cardMovement", {slot: data.slotnum, success: false});
                callback(false);
                self.nextTurn(2000);
            }
        });
        
        client.on('getCard', function(data, callback){
            if(self.isUsersTurn(data.userId)){
                var card = self.getRandomCard();
                client.broadcast.to(self.roomId).emit("newCard",{card:card})
                callback(card)
            }

        });

        client.on('nextTurn', function(data) { 
            if(self.isUsersTurn(data.userId))  
                self.nextTurn(0);
        });

        client.on('newMessage', function(data) {
            self.sendMessage(data);
        });    
    });
}

waitBeforeStart(){
    var self = this;
    setTimeout(function () {
         self.notifyPlayers("Please wait for the game to start...");
         self.notifyPlayers("Game started!");
         self.newTurn();
    }, 5000);
}

getRoomId() {
    return this.roomId;
}

getRegisteredPlayers() {
    return this.players;
}

newTurn() {
    var self = this;
    var timeleft = this.timeLimit
    

    //TODO: Handle first round specificly


        this.players.forEach(function(player){
        //The player whos turn it is
        if(self.players[self.turn] == player){
            self.io.to(player.socket.id).emit("turn",{
                round: self.round,
                playersCards: player.cards,
                time : timeleft,
                isPlayersTurn : true
            });
        }else{
            self.io.to(player.socket.id).emit("turn",{
                round: self.round,
                nameOfTurn : self.players[self.turn].name,
                cards : self.players[self.turn].cards,
                time : timeleft,
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
            self.io.to(self.players[self.turn].socket.id).emit("forceNextTurn");
            self.nextTurn(0);
            clearInterval(self.turnInterval);     
            }else {
                timeleft--;
            }
        }, 1000);
}   

sendMessage(data){
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();

    this.io.to(this.roomId).emit('message',{
        time : hours+":"+minutes+":"+seconds,
        sender : data.sender.split(' ').slice(0, -1).join(' '),//removes lastname
        message : data.message
    });   
};



validateDrop(data){
    if(data.userId == this.players[this.turn].userId){
        return true;
    }else{
        return false;
    }
};

nextTurn(delay){
    var self = this;
    clearInterval(this.turnTimer);
    setTimeout(function(){
        if(self.turn + 1 > self.players.length - 1){
            self.round++;
            self.turn = 0;
        }else{    
            self.turn++;
        }   
        self.newTurn();
    }, delay);
  
};

notifyPlayers(message){
    var date = new Date();
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var seconds = date.getSeconds();

    this.io.to(this.roomId).emit('message',{
        time : hours+":"+minutes+":"+seconds,
        sender : "Server",
        message : message
    });
}

report(){
    console.log("|NEW GAME STARTED|")
    console.log("|----------------|")
    console.log("|Players: "+this.players.length+"      |")
    console.log("|ROOMID:"+this.roomId+"  |");
    console.log("|----------------|");
}

getRandomCard(){
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

isUsersTurn(userId){
    return userId == this.players[this.turn].userId;
}

}
module.exports = GameRoom;   
























