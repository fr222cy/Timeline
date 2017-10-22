User = require('./../dao/user.js')
function addEloChange(userId, rating, change, next) {
console.log(userId + "<-UID | R=" + rating + " | C=" + change)
  User.findOne({ _id : userId}, function(err, user) { 
    if(err) {
      next(err);
      return;
    }
    if(rating === null || change === null) {
      console.log("Err: No rating provided for userId " + userId);
      return;
    }
    user.rating = rating;
    user.ratingChange = change;
    user.save(function (err) {
      if (err) {
        console.error('Err, couldnt update player statistics to DB');
        next(err);
        return;
      }
    });
    next();
  });
}

module.exports = addEloChange;