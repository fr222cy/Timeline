var User = require('./model/user.js');




module.exports = function(app, passport, io){



    require('./gameHandler.js')(app, io);

    app.get('/', function (req, res){
        res.render('index.ejs', {amountOfPlayers: 0});
    });

    app.get('/logout', function(req, res){
        req.logout();
        res.redirect('/');
    });

    app.get('/lobby', isLoggedIn, function(req, res){
        res.render('lobby.ejs', {user: req.user});
    });


    app.get('/game', isLoggedIn, function(req, res){
       res.render('game.ejs', {user: req.user});    
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


