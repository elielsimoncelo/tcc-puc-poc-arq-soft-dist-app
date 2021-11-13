#!/usr/bin/env node

const express = require('express');
const nunjunks = require('nunjucks');
const cookieParser = require('cookie-parser');
const path = require('path/posix');
const dotenv = require("dotenv");
const cors = require('cors');
const expressNunjucks = require('express-nunjucks');
const expressSession = require("express-session");
const logger = require('morgan');
var methodOverride = require('method-override')
const app = express();

//
dotenv.config();

//
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'njk');

app.use(express.static(path.join(__dirname, 'public')));
app.use('/bootstrap', express.static(path.join(__dirname, 'node_modules/bootstrap/dist')));
app.use('/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));

expressNunjucks(app, { watch:true, noCache: true, });
nunjunks.configure('views', { autoescape: true, express: app, watch: true, });

//
const session = {
  secret: process.env.SESSION_SECRET,
  cookie: {},
  resave: false,
  saveUninitialized: false,
};

if (app.get("env") === "production") {
  // Serve secure cookies, requires HTTPS
  session.cookie.secure = true;
};

app.use(expressSession(session));

//
//app.use(cors);
//app.use(logger('dev'));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

//
app.use(methodOverride(function (req, res) {
  if (req.body && typeof req.body === 'object' && '_method' in req.body) {
    // look in urlencoded POST bodies and delete it
    var method = req.body._method
    delete req.body._method
    return method
  }
}));

//
app.use(function(req, res, next) {
  const loginUrl = '/login';

  if (!req.session.username && req.originalUrl !== loginUrl) {
    res.redirect('login');
    return;
  }

  next();
});

//
app.get('/login', function (req, res) {
  res.render('login');
});

app.post('/login', (req, res) => {
  if (req.body.email === 'abc@abc' && req.body.password === '123') {
    req.session.username = req.body.email;
    return res.redirect('home');
  }

  res.render('login', { error : { message: 'Usuário ou senha inválidos.' }});
});

app.get('/logout', (req, res) => {
  req.session.destroy();
  res.redirect('/');
});

app.get('/home', function (req, res) {
  res.render('home');
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

//
app.listen(5000);
