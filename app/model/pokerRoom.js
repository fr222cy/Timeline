function PokerRoom(roomId, clients){
    this.roomId = roomId;
    this.clients = client;
}

PokerRoom.prototype.getClients = function(){
    return this.clients;
}

PokerRoom.prototype.getNumOfClients = function(){
    return this.clients.length;
}


module.exports = PokerRoom;