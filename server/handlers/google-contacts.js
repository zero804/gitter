/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf       = require('../utils/config');
var request     = require('request');
var passport    = require('passport');
var contactService = require("../services/contact-service");
var middleware  = require("../web/middleware");
var appEvents   = require('../app-events');


var token_endpoint    = "https://accounts.google.com/o/oauth2/token";
var contacts_endpoint = "https://www.google.com/m8/feeds/contacts/default/full";

var client_id     = nconf.get('googleoauth2:client_id');
var client_secret = nconf.get('googleoauth2:client_secret');

function getAccessToken(refresh_token, cb) {
  var form = {
    refresh_token:  refresh_token,
    client_id:      client_id,
    client_secret:  client_secret,
    grant_type:     "refresh_token"
  };

  request.post({url: token_endpoint, form: form, json: true}, function(err, req, body) {
    var token = body.access_token;
    cb(token);
  });
}

function fetchContacts(token, user, cb) {
  var contacts_url = contacts_endpoint + "?access_token=" + token + "&alt=json&max-results=500";
  request.get({url: contacts_url, json: true}, function(err, req, data) {
    contactService.ingestGoogleContacts(user, data, cb);
  });
}

var contactOptions = {
  accessType: 'offline',
  scope: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email',
    'https://www.google.com/m8/feeds'
  ],
  state: 'contacts'
};

var signupOptions = {
  accessType: 'offline',
  scope: [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/userinfo.email'
  ],
  state: 'signup'
};

module.exports = {
  install: function(app) {

    // Redirect user to Google OAuth authorization page.
    //
    app.get('/google/signup',
      passport.authorize('google', signupOptions),
      function(req, res) {});


    // Redirect user to Google OAuth authorization page.
    //
    app.get('/google/contacts',
      middleware.ensureLoggedIn(),
      function(req, res, next) {
        var returnTo = req.query.returnTo;

        // No http:// https:// or //hostname url
        // to prevent a possible attack
        //
        if(returnTo && returnTo.indexOf('//') < 0) {
          req.session.returnOnGoogleAuthComplete = returnTo;
        }

        next();
      },
      passport.authorize('google', contactOptions),
      function(req, res) { });

    // OAuth callback. Fetch access token and contacts, and store them.
    //
    app.get('/oauth2callback',
      passport.authorize('google', { failureRedirect: '/' }),
      middleware.ensureLoggedIn(),
      function(req, res) {
        switch(req.query.state) {
          case 'signup':
            if (req.user.status !== 'ACTIVE') {
              res.redirect('/confirm');
            } else {
              res.redirect('/');
            }
            break;
          case 'contacts':
            getAccessToken(req.user.googleRefreshToken, function(access_token) {
              fetchContacts(access_token, req.user, function() {

                appEvents.contactsUpdated(req.user.id);

                if(req.session.events) {
                  req.session.events.push('google_import_complete');
                } else {
                  req.session.events = ['google_import_complete'];
                }

                if(req.session.returnOnGoogleAuthComplete) {
                  res.relativeRedirect(req.session.returnOnGoogleAuthComplete);
                } else {
                  res.relativeRedirect('/#|share');
                }
              });
            });
            break;
          default:
            res.redirect('/');
        }
      });

    // Search contacts
    //
    app.get('/contacts',
      middleware.ensureLoggedIn(),
      function(req, res) {
        contactService.find(req.user, req.query.q, function(err, matches) {
          res.send({results: matches});
        });
      });
  }
};
