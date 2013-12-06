/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston = require("winston");
var nconf = require('../../utils/config');
var middleware = require('../../web/middleware');
var request = require('request');
var uriContextResolverMiddleware = require('./middleware').uriContextResolverMiddleware;
var jwt = require('jwt-simple');

var serviceDisplayNames = {
  github: 'GitHub',
  bitbucket: 'BitBucket',
  jenkins: 'Jenkins',
  travis: 'Travis',
  sprintly: 'Sprint.ly'
};

function getIntegrations(req, res) {
  var url = nconf.get('webhooks:basepath')+'/troupes/' + req.troupe.id + '/hooks';
  winston.info('requesting hook list at ' + url);
  request.get({
    url: url,
    json: true
  }, function(err, resp, hooks) {
    if(err || resp.statusCode != 200 || !Array.isArray(hooks)) {
      winston.error('failed to fetch hooks for troupe', { exception: err, resp: resp, hooks: hooks});
      res.send(500, 'Unable to perform request. Please try again later.');
      return;
    }
    winston.info('hook list received', { hooks: hooks });
    hooks.forEach(function(hook) {
      hook.serviceDisplayName = serviceDisplayNames[hook.service];
    });
    res.render('integrations', {
      hooks: hooks,
      troupe: req.troupe,
    });
  });
}


function deleteIntegration(req, res) {

  request.del({
    url: nconf.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks/'+req.body.id,
    json: true
  },
  function(err, resp) {
    if(err || resp.statusCode != 200) {
      winston.error('failed to delete hook for troupe', { exception: err, resp: resp });
      res.send(500, 'Unable to perform request. Please try again later.');
      return;
    }

    res.redirect('/settings/integrations/' + req.troupe.uri);
  });

}

function createIntegration(req, res) {

  request.post({
    url: nconf.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks',
    json: {
      service: req.body.service,
      endpoint: 'gitter'
    }
  },
  function(err, resp, body) {
    if(err || resp.statusCode != 200 || !body) {
      winston.error('failed to create hook for troupe', { exception: err, resp: resp });
      res.send(500, 'Unable to perform request. Please try again later.');
      return;
    }

    var encryptedUserToken;

    // Pass through the token if we have write access
    // TODO: deal with private repos too
    if(req.user.hasGitHubScope('public_repo')) {
      encryptedUserToken = jwt.encode(req.user.getGitHubToken('public_repo'), nconf.get('jwt:secret'));
    } else {
      encryptedUserToken = "";
    }

    res.redirect(body.configurationURL + "&t=" + encryptedUserToken + "&returnTo=" + nconf.get('web:basepath') + req.url);
  });

}

module.exports = {
    install: function(app) {

      app.get('/settings/integrations/:userOrOrg',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        getIntegrations);

      app.get('/settings/integrations/:userOrOrg/:repo',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        getIntegrations);

      app.del('/settings/integrations/:userOrOrg',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        deleteIntegration);

      app.del('/settings/integrations/:userOrOrg/:repo',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        deleteIntegration);

      app.post('/settings/integrations/:userOrOrg',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        createIntegration);

      app.post('/settings/integrations/:userOrOrg/:repo',
        middleware.grantAccessForRememberMeTokenMiddleware,
        middleware.ensureLoggedIn(),
        uriContextResolverMiddleware,
        createIntegration);

    }
};
