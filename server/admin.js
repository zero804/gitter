/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var express = require('express');
var exphbs  = require('express3-handlebars');
require('express-resource');

var http = require('http');
var shutdown = require('./utils/shutdown');

var app = express();
var server = http.createServer(app);

app.engine('hbs', exphbs({
	defaultLayout: 'admin-layout',
	layoutsDir: __dirname + "/../public-admin/templates/layouts/",
	extname: ".hbs"
}));

app.set('view engine', 'hbs');
app.set('views', __dirname + "/../public-admin/");

app.use(express.bodyParser());
app.use(express.methodOverride());

app.get('/', function (req, res) {
	var options = { indexPage: true };
	if(req.headers['x-pjax']) options.layout = null;
    res.render('index', options);
});

app.get(/([a-zA-Z0-9_]*)\.html/, function (req, res) {
	var options = { };
	options[req.params[0] + 'Page'] = true;
	if(req.headers['x-pjax']) options.layout = null;
    res.render(req.params[0], options);
});


app.use(express['static']( __dirname + "/../public-admin"));


// Listen to the port
server.listen(process.env.PORT || 4100);

var gracefullyClosing = false;
app.use(function(req, res, next) {
  if(!gracefullyClosing) return next();

  res.setHeader("Connection", "close");
  res.send(502, "Server is in the process of restarting");
});

shutdown.addHandler('admin', 10, function(callback) {
  gracefullyClosing = true;
  server.close(function() {
    callback();
  });
});

