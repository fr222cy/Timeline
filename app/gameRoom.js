var Card = require('./model/card.js');
var cardSchema = require('./model/cardSchema.js');

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
        this.usedCards = [];
        this.InitializeSockets();
        this.report();
        this.waitBeforeStart();
    }   

    InitializeSockets() {
        var self = this;
        this.players.forEach(function(player) {
            var client = player.socket;
            client.join(self.roomId);
        
            client.on('moveCard', function(data, callback) {
                var card = self.getCardById(data.cardId);
                self.addCardToSlot(data.slotnum, card);
                if(self.handleDrop(data, card)) {
                    client.broadcast.to(self.roomId).emit("cardMovement", {cardId: data.cardId, slot: data.slotnum, success: true});
                    callback(true, card.year);
                }else{
                    client.broadcast.to(self.roomId).emit("cardMovement", {cardId: data.cardId, slot: data.slotnum, success: false});
                    callback(false);
                    self.nextTurn(2000);
                }
            });
            
            client.on('getCard', function(data, callback){
                if(self.isUsersTurn(data.userId)){
                    self.getRandomCard(function(card){
                        client.broadcast.to(self.roomId).emit("newCard",{card:card})
                        var year  = card.year;
                        card.year = "?";
                        callback(card);
                        card.year = year;
                    });
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

    getRandomCard(callback) {
        var self = this;
        cardSchema.count().exec(function (err, count) {
            var random = Math.floor(Math.random() * count)
            cardSchema.findOne().skip(random).exec(
                function (err, cardData) { 
                    var card = new Card(cardData._id, cardData.description, cardData.year);
                    self.usedCards.push(card);
                    callback(card);
            });
        });
    }

    getCardById(id) {
        for (var i=0; i < this.usedCards.length; i++) {
            if (this.usedCards[i].id == id) {
                console.log("Returning " + this.usedCards[i]);
                return this.usedCards[i];
            }
        }   
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

    addCardToSlot(slotNum, card){ 
        slotNum--;
        var cards = this.players[this.turn].cards;
        if (cards.includes(card)) {
            cards[cards.indexOf(card)] = 0;
            cards[slotNum] = card;
        } else {
             cards[slotNum] = card;
        }
           console.log(cards);
    }

    removeUnlockedCards(){
        var cards = this.players[this.turn].cards;
        
        for(var i = 0; i < cards.length; i++){
            if(cards[i] !== 0){
                if(!cards[i].isLocked){
                    cards[i] = 0;
                }
            }
        }
    }



    handleDrop(data, card){
        if(data.userId !== this.players[this.turn].userId){
            return false;
        }
        var cards = this.players[this.turn].cards; 
        
        //Check if first drop
        var emptySlots = 0;
        cards.forEach(function(card){
            if(card === 0){ 
                emptySlots++
            };
        });
        if(emptySlots === 9){ 
            return true 
        };
       
        for(var i = 0; i <= cards.length; i++){
            var current = cards[i];
            
            if(current === 0 || current == null){ 
                continue; 
            }
                for(var y = i+1; i <= cards.length - i; y++){
                    var next = cards[y];
                    if(y >= cards.length){
                        break;
                    }

                    if(next === 0 ){ 
                        continue;
                    }
                    
                    if(current.year >= next.year){
                        this.removeUnlockedCards();
                        return false;
                    } 
                }
        }
        return true;          
    };

    nextTurn(delay){
        var cards = this.players[this.turn].cards;
        cards.forEach(function(card){
            if(card !== 0){
                card.isLocked = true;
            }
        });


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




    isUsersTurn(userId){
        return userId == this.players[this.turn].userId;
    }

}
module.exports = GameRoom;   
























