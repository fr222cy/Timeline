var express = require('express');
var app = express();
var port = process.env.PORT || 8080;

var morgan = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var mongoose = require('mongoose');
var bodyParser = require('body-parser');
var passport = require('passport');
var flash = require('connect-flash');

var configDB = require('./config/database.js');
mongoose.connect(configDB.url);
require('./config/passport')(passport);
app.use(morgan('dev'));
app.use(cookieParser());
app.use(bodyParser.urlencoded({extended: true}));
app.use(session({secret: "secretString",
                 saveUninitialized: true,
                 resave: true}));

app.use(passport.initialize())
app.use(passport.session());
app.use(flash());

app.set('view engine', 'ejs');

    
require('./app/routes.js')(app, passport);

app.listen(port);
console.log("Server is running on port: "+port);
