/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var middleware = require('../web/middleware');
var request = require('request');
var uriContextResolverMiddleware = require('../web/uri-context-resolver-middleware');

var serviceDisplayNames = {
  github: 'GitHub',
  bitbucket: 'BitBucket',
  jenkins: 'Jenkins',
  travis: 'Travis',
};

module.exports = {
    install: function(app) {

      app.get('/:appUri/integrations',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function (req, res) {
          request.get({
            url: nconf.get('webhooks:basepath')+'/troupes/'+req.troupe._id+'/hooks',
            json: true
          }, function(err, resp, hooks) {
            hooks.forEach(function(hook) {
              hook.serviceDisplayName = serviceDisplayNames[hook.service];
            });
            res.render('integrations', {
              hooks: hooks,
              troupe: req.troupe,
            });
          });
        });

      app.del('/:appUri/integrations',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function (req, res) {
          request.del({
            url: nconf.get('webhooks:basepath')+'/troupes/'+req.troupe._id+'/hooks/'+req.body.id,
            json: true
          },
          function() {
            res.redirect('/'+req.troupe.uri+'/integrations');
          });
        });

      app.post('/:appUri/integrations',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        function(req, res) {
          request.post({
            url: nconf.get('webhooks:basepath')+'/troupes/'+req.troupe._id+'/hooks',
            json: {
              service: req.body.service,
            }
          },
          function(err, resp, body) {
            if(err || !body) {
              res.send("Unable to perform request. Please try again later.");
              return;
            }
            // TODO: Make sure this is properly encoded
            res.redirect(body.configurationURL + "&returnTo=" + nconf.get('web:basepath') + req.url);
          });
        });

    }
};
