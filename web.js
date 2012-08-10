/*global console:false, require: true, module: true, process: false, __dirname:false */
"use strict";

var express = require('express'),
	Resource = require('express-resource'),
  fs = require('fs'),
	userService = require('./server/services/user-service'),
	troupeService = require('./server/services/troupe-service'),
	passport = require('passport'),
	LocalStrategy = require('passport-local').Strategy,
	ConfirmStrategy = require('./server/utils/confirm-strategy').Strategy,
  nconf = require('./server/utils/config').configure(),
  httpUtils = require('./server/utils/http'),
  rememberMe = require('./server/utils/rememberme-middleware'),
  winston = require('./server/utils/winston');

/* TODO: put all our prototypes in a module */
Array.prototype.narrow = function() {
  return this.map(function(value) { return value.narrow(); });
};

var RedisStore = require('connect-redis')(express);

var app = express.createServer();

var hbs = require('hbs');

hbs.registerHelper('cdn', require('./server/utils/cdn-helper'));
// TODO:come up with a better solution that this!
hbs.registerPartial('require_config', fs.readFileSync(__dirname + '/' + nconf.get('web:staticContent') +'/templates/require_config.hbs', 'utf8'));

app.set('basepath', "/");
app.set('view engine', 'hbs');
app.set('views', __dirname + '/' + nconf.get('web:staticContent') +'/templates');
//app.set('view engine', 'mustache');
app.set('view options',{layout:false});
//app.register(".mustache", tmpl);

passport.use(new LocalStrategy({
      usernameField: 'email',
      passwordField: 'password'
    },
    function(email, password, done) {
      winston.debug("Attempting to authenticate " + email);
      userService.findByEmail(email, function(err, user) {
        if(err) return done(err);
        if(!user) return done(null, false);

        if(user.status != 'ACTIVE') {
          winston.info("User not yet activated");
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

passport.use(new ConfirmStrategy({ name: "confirm" }, function(confirmationCode, done) {
    winston.info("Invoking confirm strategy");

    userService.findByConfirmationCode(confirmationCode, function(err, user) {
      if(err) return done(err);
      if(!user) return done(null, false);

      return done(null, user);
    });
  })
);

passport.use(new ConfirmStrategy({ name: "accept" }, function(confirmationCode, done) {
  winston.info("Invoking accept strategy");

  troupeService.findInviteByCode(confirmationCode, function(err, invite) {
    if(err) return done(err);
    if(!invite) return done(null, false);

    if(invite.status != 'UNUSED') {
      return done(new Error("This invite has already been used"));
    }

    userService.findOrCreateUserForEmail({ displayName: invite.displayName, email: invite.email, status: "PROFILE_NOT_COMPLETED" }, function(err, user) {
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

var sessionStore = new RedisStore();

app.configure(function() {
  if(nconf.get("express:logging")) {
    app.use(express.logger());
  }

  /* Additional body parsers */
  require('./server/utils/bodyparsers-additional.js').install();

  app.use(express['static'](__dirname + "/" + nconf.get('web:staticContent')));

  app.use(express.cookieParser());
  app.use(express.bodyParser());
  app.use(express.session({ secret: 'keyboard cat', store: sessionStore, cookie: { path: '/', httpOnly: true, maxAge: 14400000, domain: nconf.get("web:cookieDomain"), secure: false /*nconf.get("web:secureCookies") Express won't sent the cookie as the https offloading is happening in nginx. Need to have connection.proxySecure set*/ }}));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(rememberMe.rememberMeMiddleware());
  app.use(app.router);

  app.use(express.errorHandler({ showStack: nconf.get('express:showStack'), dumpExceptions: nconf.get('express:dumpExceptions') }));
});

require('./server/now').install(app, sessionStore);
require('./server/handlers/signup').install(app);
require('./server/handlers/signout').install(app);
require('./server/handlers/profile').install(app);
require('./server/handlers/login').install(app);
require('./server/handlers/invite').install(app);
require('./server/handlers/request-access').install(app);
require('./server/handlers/avatar').install(app);
require('./server/handlers/landing').install(app);

// TEMP
require('./server/services/thumbnail-preview-generator-service').install();
require('./server/services/notification-generator-service').install();

// TEMPORARY!
require('./server/handlers/mobile').install(app);

/* REST resources: not used yet */
var troupesResource = app.resource('troupes',  require('./server/resources/troupes.js'));
var sharesResource = app.resource('invites',  require('./server/resources/invites.js'));
var usersResource = app.resource('users',  require('./server/resources/users.js'));
var conversationsResource = app.resource('conversations', require('./server/resources/conversations.js'));
var filesResource = app.resource('files', require('./server/resources/files.js'));
var downloadsResource = app.resource('downloads',  require('./server/resources/downloads.js'));
var embeddedResource = app.resource('embedded',  require('./server/resources/embedded.js'));
var thumbnailsResource = app.resource('thumbnails',  require('./server/resources/thumbnails.js'));
var chatMessagesResource = app.resource('chatMessages',  require('./server/resources/chat-messages.js'));
var notificationsResource = app.resource('notifications',  require('./server/resources/notifications.js'));

troupesResource.add(sharesResource);
troupesResource.add(usersResource);
troupesResource.add(conversationsResource);
troupesResource.add(filesResource);
troupesResource.add(downloadsResource);
troupesResource.add(chatMessagesResource);
troupesResource.add(embeddedResource);
troupesResource.add(thumbnailsResource);
troupesResource.add(notificationsResource);

/* This should be last */
require('./server/handlers/app').install(app);

var port = nconf.get("PORT");
app.listen(port, function() {
  winston.info("Listening on " + port);
});
