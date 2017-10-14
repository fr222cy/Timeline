var mongoose = require('mongoose');
var bcrypt = require('bcrypt')
var userSchema = mongoose.Schema({
    local: {
        username: String,
        password: String
    },
    facebook: {
        id: String,
        token: String,
        email: String, 
        name: String,
        username: String
    },
    displayname: String,
    wins: Number,
    drawed: Number,
    played: Number
});

userSchema.methods.generateHash = function(password){
    return bcrypt.hashSync(password, bcrypt.genSaltSync(5));
}

userSchema.methods.validatePassword = function(password){
    return bcrypt.compareSync(password, this.local.password);
}

module.exports = mongoose.model('User', userSchema, "Users");