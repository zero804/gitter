/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var winston                      = require('../../utils/winston');
var nconf                        = require('../../utils/config');
var roomPermissionsModel         = require('../../services/room-permissions-model');
var request                      = require('request');
var uriContextResolverMiddleware = require('./middleware').uriContextResolverMiddleware;
var jwt                          = require('jwt-simple');
var cdn                          = require('../../web/cdn');
var services                     = require('gitter-services');
var ensureLoggedIn               = require('../../web/middlewares/ensure-logged-in');

var supportedServices = [
  {id: 'github', name: 'GitHub'},
  {id: 'bitbucket', name: 'BitBucket'},
  {id: 'trello', name: 'Trello'},
];

var openServices = Object.keys(services).map(function(id) {
  return {
    id: id,
    name: services[id].name
  };
});

var serviceIdNameMap = supportedServices.concat(openServices).reduce(function(map, service) {
  map[service.id] = service.name;
  return map;
}, {});

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
      hook.serviceDisplayName = serviceIdNameMap[hook.service];
    });

    res.render('integrations', {
      hooks: hooks,
      troupe: req.troupe,
      accessToken: req.accessToken,
      cdnRoot: cdn(''),
      supportedServices: supportedServices,
      openServices: openServices
    });
  });
}


function deleteIntegration(req, res) {

  request.del({
    url: nconf.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks/' + req.body.id,
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

    res.redirect(body.configurationURL +
      "&rt=" + resp.body.token +
      "&ut=" + encryptedUserToken +
      "&returnTo=" + nconf.get('web:basepath') + req.url
    );
  });
}

function adminAccessCheck(req, res, next) {
  var uriContext = req.uriContext;
  roomPermissionsModel(req.user, 'admin', uriContext.troupe)
    .then(function(access) {
      if(!access) return next(403);

      next();
    });
}

module.exports = {
    install: function(app) {

      [
        '/settings/integrations/:roomPart1',
        '/settings/integrations/:roomPart1/:roomPart2',
        '/settings/integrations/:roomPart1/:roomPart2/:roomPart3'
      ].forEach(function(uri) {

        app.get(uri,
          ensureLoggedIn,
          uriContextResolverMiddleware({ create: false }),
          adminAccessCheck,
          getIntegrations);

        app.delete(uri,
          ensureLoggedIn,
          uriContextResolverMiddleware({ create: false }),
          adminAccessCheck,
          deleteIntegration);

        app.post(uri,
          ensureLoggedIn,
          uriContextResolverMiddleware({ create: false }),
          adminAccessCheck,
          createIntegration);

      });
    }
};
