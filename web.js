var express = require('express'),
	Resource = require('express-resource'),
	tmpl = require('./server/mustache-template');

var app = express.createServer(
    express.cookieParser(),
    express.session({ secret: 'all your moo' })
);

app.configure(function() {
  app.use(express.bodyParser());
  app.use(app.router);
  app.use(express.logger());
  app.use(express.static(__dirname + '/public'));
  
  app.set('view engine', 'mustache');
  app.set('view options',{layout:false});  
  app.register(".mustache", tmpl);
});

require('./server/handlers/confirm').install(app);
require('./server/handlers/signup').install(app);

app.resource('api/projects',  require('./server/resources/projects.js'));

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
