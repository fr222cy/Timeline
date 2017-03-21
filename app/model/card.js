function Card(description, year, cardId){
    this.description = description;
    this.year = year;
    this.cardId = cardId
    this.isEnabled = true;
}

Card.prototype.enableCard = function(){
    this.isEnabled = true;
}

Card.prototype.disableCard = function(){
    this.isEnabled = false;
}

Card.prototype.cardHTML = function(){
    if(enableCard){
        return null;
    }
}

Card.prototype.getYear = function(){
    return this.year;
}

Card.prototype.getDesc = function(){
    return this.description;
}

module.exports = Card;
