var User = require('./dao/user.js');
var addDisplayName = require('./dbProcs/addDisplayname.js');

module.exports = function (app, passport, io) {

	require('./joinGameHandler.js')(app, io);
	

	app.get('/', function (req, res) {
		res.render('index.ejs', { amountOfPlayers: io.engine.clientsCount });
	});

	app.get('/logout', function (req, res) {
		req.logout();
		res.redirect('/');
	});

	app.get('/lobby', isLoggedIn, function (req, res) {
		User.findOne({ '_id': req.user._id }, function (err, user) {
			if (user.displayname == null) {
				res.redirect("/newUser");
			}
		});

		User.find({}).sort({ wins: -1 }).limit(5).exec(function (err, topUsersResult) {
			if (err) {
				topUsersResult = "Could not fetch ladder data"
			}
			res.render('lobby.ejs', { user: req.user, topUsers: topUsersResult });
		});
	});


	app.get('/play', isLoggedIn, function (req, res) {
		if(req.query.mode === "match_making"){
			res.render('matchmaking.ejs', { user: req.user });
		}
		else if(req.query.mode === "create_private") {
			res.render('private.ejs', { user: req.user, isLeader: true })
		}
		else if(req.query.mode === "join_private") {
			res.render('private.ejs', { user: req.user, isLeader: false })
		}
		else {
			res.redirect('/lobby');
		}
	});

	app.get('/auth/facebook', passport.authenticate('facebook', { scope: ['email'] }));

	app.get('/auth/facebook/callback',
		passport.authenticate('facebook', { failureRedirect: '/' }),
		function (req, res) {
			// Successful authentication, redirect home.
			res.redirect('/lobby');
		});

	app.get('/newUser', isLoggedIn, function (req, res) {		
		res.render('setName.ejs', { message: req.flash('setDisplaynameMessage') });
	});

	app.post('/newUser', function (req, res) {
		addDisplayName(req,res, function (isValid) {
			if (!isValid) {
				res.redirect("/newUser");
				return;
			}
			res.redirect("/lobby");
		});
	});

	//The Local Login functions. Not used at the moment.
	app.get('/login', function (req, res) {
		res.render('login.ejs', { message: req.flash('loginMessage') });
	});

	app.post('/login', passport.authenticate('local-login', {
		successRedirect: '/lobby',
		failureRedirect: '/login',
		failureFlash: true
	}));

	app.get('/signup', function (req, res) {
		res.render('signup.ejs', { message: req.flash('signupMessage') });
	});

	app.post('/signup', passport.authenticate('local-signup', {
		successRedirect: '/',
		failureRedirect: '/signup',
		failureFlash: true
	}));
};

function isLoggedIn(req, res, next) {
	if (req.isAuthenticated()) {
		return next();
	}
	res.redirect('/');
}


