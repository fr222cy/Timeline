class Card{
    constructor(id ,description, year){
        this.id = id
        this.description = description;
        this.year = year;
        this.isLocked = false;
        this.isDropped = false;
    }

    lock(){
        this.isLocked = true;
    }

    unlock(){
        this.isLocked = false;
    }

    cardHTML(){
        if(enableCard){
            return null;
        }
    }

    getYear(){
        return this.year;
    }

    getDesc(){
        return this.description;
    }
}
module.exports = Card;
