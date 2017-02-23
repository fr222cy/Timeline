var User = require('./model/user.js');

var GameHandler = require('./game.js');
var gameHandler = new GameHandler();


module.exports = function(app, passport, io){
gameHandler.running(app, io);


    var createGame = function(gameId, players){     
        gameHandler.newGame(gameId, players);
    }

    require('./queue.js')(app, io, createGame);
    console.log(gameHandler.getAmountOfPlayers())
    app.get('/', function (req, res){
        res.render('index.ejs', {amountOfPlayers: gameHandler.getAmountOfPlayers()});
    });

    app.get('/logout', function(req, res){
        req.logout();
        res.redirect('/');
    });

    app.get('/lobby', isLoggedIn, function(req, res){
        res.render('lobby.ejs', {user: req.user});
    });

    app.get('/game/:gameid', isLoggedIn, function(req, res){
        if(isInGame(req.user.facebook.id, req.params.gameid)){
            res.render('gameRoom.ejs', {user: req.user});
        }else{
            res.redirect('/lobby')
        }
    });

    app.get('/queue', isLoggedIn, function(req, res){
        
        res.render('queue.ejs', {user: req.user});    
    });

    app.get('/auth/facebook', passport.authenticate('facebook', {scope:['email']}));

    app.get('/auth/facebook/callback',
        passport.authenticate('facebook', { failureRedirect: '/' }),
        function(req, res) {
        // Successful authentication, redirect home.
        res.redirect('/lobby');
    });


    //The Local Login functions. Not used at the moment.
    app.get('/login', function(req, res){
        res.render('login.ejs', {message: req.flash('loginMessage')});
    });

    app.post('/login', passport.authenticate('local-login', {
        successRedirect: '/lobby',
        failureRedirect: '/login',
        failureFlash: true
    }));

    app.get('/signup', function(req,res){
        res.render('signup.ejs', {message: req.flash('signupMessage')});
    });

    app.post('/signup', passport.authenticate('local-signup', {
        successRedirect: '/',
        failureRedirect: '/signup',
        failureFlash: true
    }));

};



function isLoggedIn(req, res, next){
    if(req.isAuthenticated()){
        return next();
    }
    res.redirect('/');
}

function isInGame(userId, roomId){
    console.log("UserID:"+ userId);
    console.log("RoomID:"+ roomId);
    if(userId != null){
         if(gameHandler.isAuthorized(userId, roomId)){
             return true;
         }
    }
    return false;
}
