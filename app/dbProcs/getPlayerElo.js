User = require('./../dao/user.js')
function getPlayerElo(userId ,next) {
  User.findOne({ _id : userId}, function(err, user) { 
    if(err) {
      next(err);
      return;
    }
    next(null, user.rating);
  });
}

module.exports = getPlayerElo;