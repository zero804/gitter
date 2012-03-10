var express = require('express'),
	Resource = require('express-resource'),
	tmpl = require('./server/mustache-template'),
	userService = require('./server/services/user-service'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	ConfirmStrategy = require('./server/utils/confirm-strategy').Strategy;
  

var app = express.createServer(
    express.cookieParser(),
    express.session({ secret: 'all your moo' })
); 

passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    },
    function(email, password, done) {
      userService.findByEmail(email, function(err, user) {
        if(err) return done(err);
        if(!user) return done(null, false);
        
        if(user.status != 'ACTIVE') {
          console.log("User not yet activated");
          return done(null, false);
        }
        
        userService.checkPassword(user, password, function(match) {
          if(!match) return done(null, false);
        
          /* Todo: consider using a seperate object for the security user */
          return done(null, user);

        });
      });
    }
));

passport.use(new ConfirmStrategy(function(confirmationCode, done) {
    userService.findByConfirmationCode(confirmationCode, function(err, user) {
      if(err) return done(err);
      if(!user) return done(null, false);
      
      return done(null, user);
    });
  })
);


passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  console.log("Deserialing: " + id);

  userService.findById(id, function(err, user) {
    if(err) return done(err);
    if(!user) return done(null, false);

    /* Todo: consider using a seperate object for the security user */
    return done(null, user);
  });

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
require('./server/handlers/login').install(app);

/* REST resources: not used yet */
app.resource('api/projects',  require('./server/resources/projects.js'));

require('./server/handlers/app').install(app);


var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
