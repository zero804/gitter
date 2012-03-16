
var express = require('express'),
	Resource = require('express-resource'),
	tmpl = require('./server/mustache-template'),
	userService = require('./server/services/user-service'),
	troupeService = require('./server/services/troupe-service'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	ConfirmStrategy = require('./server/utils/confirm-strategy').Strategy;
  
var RedisStore = require('connect-redis')(express);

var app = express.createServer(
    express.cookieParser(),
    express.session({ secret: 'keyboard cat', store: new RedisStore})
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
        console.log("Checking password");
        userService.checkPassword(user, password, function(match) {
          if(!match) return done(null, false);
        
          /* Todo: consider using a seperate object for the security user */
          return done(null, user);

        });
      });
    }
));

passport.use(new ConfirmStrategy({ name: "confirm" }, function(confirmationCode, done) {
    userService.findByConfirmationCode(confirmationCode, function(err, user) {
      if(err) return done(err);
      if(!user) return done(null, false);
      
      return done(null, user);
    });
  })
);

passport.use(new ConfirmStrategy({ name: "accept" }, function(confirmationCode, done) {
  troupeService.findInviteByCode(confirmationCode, function(err, invite) {
    if(err) return done(err);
    if(!invite) return done(null, false);
    
    if(invite.status != 'UNUSED') {
      return done(new Error("This invite has already been used"));
    }
    
    userService.findOrCreateUserForEmail({ displayName: invite.displayName, email: invite.email, status: "ACTIVE" }, function(err, user) {
      return done(null, user);  
    });
    
  });
})
);

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
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
  app.use(express.bodyParser());
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
}); 

var everyone = require("now").initialize(app);

everyone.now.distributeMessage = function(message){
  everyone.now.receiveMessage("moo", message);
};

require('./server/handlers/confirm').install(app);
require('./server/handlers/signup').install(app);
require('./server/handlers/profile').install(app);
require('./server/handlers/login').install(app);
require('./server/handlers/invite').install(app);

/* REST resources: not used yet */
var troupesResource = app.resource('troupes',  require('./server/resources/troupes.js'));
var sharesResource = app.resource('shares',  require('./server/resources/shares.js'));
var usersResource = app.resource('users',  require('./server/resources/users.js'));
troupesResource.add(sharesResource);
troupesResource.add(usersResource);

/* This should be last */
require('./server/handlers/app').install(app);


var port = process.env.PORT || 5000;
app.listen(port, function() {
  console.log("Listening on " + port);
});
