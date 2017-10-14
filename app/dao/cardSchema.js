var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var cardSchema = new Schema({
    description: String,
    year: [Number]
});

module.exports = mongoose.model('card', cardSchema, "Cards");
