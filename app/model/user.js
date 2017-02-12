var mongoose = require('mongoose');

var userSchema = mongoose.Schema({
    local: {
        username: String,
        password: String,
        wins: Number,
        losses: Number
    }
});

module.exports = mongoose.model('User', userSchema, "Users");