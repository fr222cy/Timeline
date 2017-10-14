var LocalStrategy = require('passport-local').Strategy;
var FacebookStrategy = require('passport-facebook').Strategy;

var User = require('../app/dao/user');
var configAuth = require('./auth');


module.exports = function(passport){

    passport.serializeUser(function(user,done){
        done(null, user.id);
    });

    passport.deserializeUser(function(id, done){
        User.findById(id, function(err, user){
            done(err, user);
        });
    });

    passport.use('local-set-displayname', new LocalStrategy({
        usernameField: 'displayname',
        passwordField: 'password',
        passReqToCallback : true
    },
    function(req, username, password, done) {
        process.nextTick(function() {
            displayname = username;
            User.findOne({'displayName' : displayname}, function(err, alreadyExistingUser) { // Check if name already exists
                if(err) {
                    return done(err, false, req.flash('setDisplaynameMessage', 'Something went wrong! Please try again'));
                }
                if(alreadyExistingUser) {
                    return done(err, false, req.flash('setDisplaynameMessage', 'That name is already taken!'));
                } 
                    var newDisplayname = displayname.replace(/[|&;$%@"<>()+,]/g, "");
                    User.findOne({'_id' : req.user._id}, function(err, user) { //Get the user
                        if(err) {
                           return done(err, false, req.flash('setDisplaynameMessage', 'Something went wrong! Please try again')); 
                        }
                        if(user){
                            user.displayname = newDisplayname; // set new name
                            console.log("SET NEW NAME")
                            user.save(function(err) { // save name
                                if(err) {
                                    return done(err, false, req.flash('setDisplaynameMessage', 'Something went wrong! Please try again'));
                                }
                                console.log("SAVED NEW NAME")
                                return done(null, user);
                            });
                        }
                    });
                
            });
        })
    }));

    passport.use('local-signup', new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback : true
    },
    function(req, username, password, done){
        process.nextTick(function(){
            User.findOne({'local.username': username}, function(err,user){
                if(err){
                    return done(err);
                }
                if(user){
                    return done(null, false, req.flash('signupMessage', 'That username is already taken'));
                } else{
                    var newUser = new User();
                    newUser.local.username = username;
                    newUser.local.password = newUser.generateHash(password);

                    newUser.save(function(err){
                        if(err){
                            throw err;
                        }
                        return done(null, newUser);
                    });
                }
            });
        });
    }));

    passport.use('local-login', new LocalStrategy({
        usernameField: 'username',
        passwordField: 'password',
        passReqToCallback : true
    },
    function(req, username, password, done){
        process.nextTick(function(){
            User.findOne({'local.username': username}, function(err, user){
                if(err)
                    return done(err);
                if(!user)
                    return done(null, false, req.flash('loginMessage', 'No user found'));
                if(!user.validatePassword(password))
                    return done(null,false,req.flash('loginMessage', 'Invalid password'));
                return done(null, user);
            });
        });
    }));

    passport.use(new FacebookStrategy({
    clientID: configAuth.facebook.clientID,
    clientSecret: configAuth.facebook.clientSecret,
    callbackURL: configAuth.facebook.callbackURL,
    profileFields: ['id','photos', 'email', 'name']
  },
    function(accessToken, refreshToken, profile, done) {
       process.nextTick(function(){
           User.findOne({'facebook.id': profile.id}, function(err,user) {
               if(err)
                return done(err);
                if(user)
                return done(null, user);
                else
                    var newUser = new User();
                    newUser.facebook.id = profile.id;
                    newUser.facebook.token = accessToken;
                    newUser.facebook.name = profile.name.givenName +  " " + profile.name.familyName;
                    newUser.facebook.email = profile.emails[0].value;
                    newUser.facebook.username = profile.username;
                    newUser.facebook.profilePictureURL = //graph.facebook.com/"newUser.facebook.id"/picture";

                    newUser.save(function(err){
                        if(err)
                            throw err;
                        return done(null, newUser);
                    })
           });
       });
    }
    ));


}