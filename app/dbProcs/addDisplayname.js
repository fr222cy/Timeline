User = require('./../dao/user.js')
function addDisplayname(req,res, cb) {
  var displayname = req.body.displayname;
  User.findOne({'displayname' : displayname}, function(err, alreadyExistingUser) { // Check if name already exists
    if(err) {
      req.flash('setDisplaynameMessage', 'Something went wrong! Please try again');
      cb(false);
    }
    if(alreadyExistingUser) {
      req.flash('setDisplaynameMessage', 'That name is already taken!');
      res.redirect("/newUser");
      cb(false);
    }
    var newDisplayname = displayname.replace(/[|&;$%@"<>()+,]/g, "");
    User.findOne({'_id' : req.user._id}, function(err, user) { //Get the user
      if(err) {
        req.flash('setDisplaynameMessage', 'Something went wrong! Please try again');
        res.redirect("/newUser");
        cb(false);
      }
      if(user){
        user.displayname = newDisplayname; // set new name
        user.save(function(err) { // save name
          if(err) {
          req.flash('setDisplaynameMessage', 'Something went wrong! Please try again');
          res.redirect("/newUser");
          cb(false);
          }
          cb(true);
        });
      }
    });
  });
}

module.exports = addDisplayname;