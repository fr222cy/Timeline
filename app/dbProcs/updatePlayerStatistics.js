User = require('./../dao/user.js');

function updatePlayerStatistics(userId, reason) {
  User.findOne({ _id: userId }, function (err, user) {
    switch (reason) {
      case "ADD_PLAYED":
        console.log("Adding played to " + user.displayname);
        if (user.played == null) {
          user.played = 0;
        }
        user.played++
        break;
      case "ADD_DRAW":
        console.log("Adding drawed to " + user.displayname);
        if (user.drawed == null) {
          user.drawed = 0;
        }
        user.drawed++
        break;
      case "ADD_WIN":
        console.log("Adding win to " + user.displayname);
        if (user.wins == null) {
          user.wins = 0;
        }
        user.wins++;
        break;
    }
    user.save(function (err) {
      if (err) {
        console.error('Err, couldnt update player statistics to DB');
      }
    });
  });
};
module.exports = updatePlayerStatistics;