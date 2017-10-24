User = require('./../dao/user.js')
function addDisplayname(req, cb) {
  var displayname = req.body.displayname;
  User.findOne({'displayname' : displayname}, function(err, alreadyExistingUser) { // Check if name already exists
    if(err) {
      req.flash('setDisplaynameMessage', 'Something went wrong! Please try again');
      cb(false);
      return;
    }
    if(alreadyExistingUser) {
      req.flash('setDisplaynameMessage', 'That name is already taken!');
      cb(false);
      return;
    }

    if(/[|&;$%@"<>()+,]/.test(displayname)) {
      req.flash('setDisplaynameMessage', 'No weird characters!');
      cb(false);
      return;
    }

    if(displayname.length < 4 ) {
      req.flash('setDisplaynameMessage', 'Must be more than 4 characters!');
      cb(false);
      return;
    }

    if(displayname.length > 14 ) {
      req.flash('setDisplaynameMessage', 'Must be less than 15 characters!');
      cb(false);
      return;
    }
  
    User.findOne({'_id' : req.user._id}, function(err, user) { //Get the user
      if(err) {
        req.flash('setDisplaynameMessage', 'Something went wrong! Please try again');
        cb(false);
        return;
      }
      if(user){
        user.displayname = displayname; // set new name
        user.save(function(err) { // save name
          if(err) {
          req.flash('setDisplaynameMessage', 'Something went wrong! Please try again');
          cb(false);
          return;
          }
          cb(true);
        });
      }
    });
  });
}

module.exports = addDisplayname;