var express = require('express'),
	Resource = require('express-resource'),
	tmpl = require('./server/mustache-template'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy;

var app = express.createServer(
    express.cookieParser(),
    express.session({ secret: 'all your moo' })
); 


passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    },
    function(username, password, done) {
      /*
      User.findOne({ username: username }, function (err, user) {
        if (err) { return done(err); }
        if (!user) { return done(null, false); }
        if (!user.validPassword(password)) { return done(null, false); }
        return done(null, user);
      });
      */
      console.log("Auth");
      var d = done(null, { name: "moo" });
      console.log("Callback complete");
      
      return d;
    }
));

passport.serializeUser(function(user, done) {
  console.log("serialize");
  done(null, user.name);
});

passport.deserializeUser(function(id, done) {
  /*User.findById(id, function (err, user) {
    done(err, user);
  });*/
  console.log("deserialize");
  done(null, { name: id });
});

app.configure(function() {
  app.set('views', __dirname + '/public/templates');
  app.set('view engine', 'mustache');
  app.set('view options',{layout:false});  
  app.register(".mustache", tmpl);

  app.use(express.logger());

  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat' }));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
});

require('./server/handlers/confirm').install(app);
require('./server/handlers/signup').install(app);
require('./server/handlers/profile').install(app);
require('./server/handlers/app').install(app);
require('./server/handlers/login').install(app);

app.resource('api/projects',  require('./server/resources/projects.js'));

var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
