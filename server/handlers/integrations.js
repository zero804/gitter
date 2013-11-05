/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf = require('../utils/config');
var middleware = require('../web/middleware');
var request = require('request');
var uriContextResolverMiddleware = require('../web/uri-context-resolver-middleware');

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
            res.render('integrations', {
              hooks: hooks,
              troupe: req.troupe,
              services: ['github', 'bitbucket', 'jenkins', 'travis']
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
            // TODO: Make sure this is properly encoded
            res.redirect(body.configurationURL + "&returnTo=" + nconf.get('web:basepath') + req.url);
          });
        });

    }
};
