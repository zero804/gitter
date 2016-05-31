"use strict";

var env = require('gitter-web-env');
var logger = env.logger;
var stats = env.stats;
var config = env.config;
var express = require('express');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var crypto = require('crypto');
var userSettingsService = require('../services/user-settings-service');
var passphrase = config.get('email:unsubscribeNotificationsSecret');
var request = require('request');
var uriContextResolverMiddleware = require('./app/middleware').uriContextResolverMiddleware;
var jwt = require('jwt-simple');
var cdn = require('../web/cdn');
var services = require('gitter-services');
var identifyRoute = env.middlewares.identifyRoute;
var debug = require('debug')('gitter:app:settings-route');
var StatusError = require('statuserror');
var userScopes = require('gitter-web-identity/lib/user-scopes');

var supportedServices = [
  { id: 'github', name: 'GitHub'},
  { id: 'bitbucket', name: 'BitBucket'},
  { id: 'trello', name: 'Trello'},
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

function getIntegrations(req, res, next) {
  debug('Get integrations for %s', req.troupe.url);

  var url = config.get('webhooks:basepath')+'/troupes/' + req.troupe.id + '/hooks';
  request.get({
    url: url,
    json: true
  }, function(err, resp, hooks) {
    if(err || resp.statusCode !== 200 || !Array.isArray(hooks)) {
      logger.error('failed to fetch hooks for troupe', { exception: err, resp: resp, hooks: hooks});
      return next(new StatusError(500, 'Unable to perform request. Please try again later.'));
    }

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


function deleteIntegration(req, res, next) {
  debug('Delete integration %s for %s', req.body.id, req.troupe.url);

  request.del({
    url: config.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks/' + req.body.id,
    json: true
  },
  function(err, resp) {
    if(err || resp.statusCode !== 200) {
      logger.error('failed to delete hook for troupe', { exception: err, resp: resp });
      return next(new StatusError(500, 'Unable to perform request. Please try again later.'));
    }

    res.redirect('/settings/integrations/' + req.troupe.uri);
  });

}

function createIntegration(req, res, next) {
  debug('Create integration for %s', req.body.service, req.troupe.url);

  request.post({
    url: config.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks',
    json: {
      service: req.body.service,
      endpoint: 'gitter'
    }
  },

  function(err, resp, body) {
    if(err || resp.statusCode !== 200 || !body) {
      logger.error('failed to create hook for troupe', { exception: err, resp: resp });
      return next(new StatusError(500, 'Unable to perform request. Please try again later.'));
    }

    var encryptedUserToken;

    // Pass through the token if we have write access
    // TODO: deal with private repos too
    if(userScopes.hasGitHubScope(req.user, 'public_repo')) {
      encryptedUserToken = jwt.encode(userScopes.getGitHubToken(req.user, 'public_repo'), config.get('jwt:secret'));
    } else {
      encryptedUserToken = "";
    }

    res.redirect(body.configurationURL +
      "&rt=" + resp.body.token +
      "&ut=" + encryptedUserToken +
      "&returnTo=" + config.get('web:basepath') + req.originalUrl
    );
  });
}

function adminAccessCheck(req, res, next) {
  var uriContext = req.uriContext;
  var policy = uriContext.policy;

  return policy.canAdmin()
    .then(function(access) {
      if(!access) throw new StatusError(403);
    })
    .nodeify(next);
}

var router = express.Router({ caseSensitive: true, mergeParams: true });

[
  '/integrations/:roomPart1',
  '/integrations/:roomPart1/:roomPart2',
  '/integrations/:roomPart1/:roomPart2/:roomPart3'
].forEach(function(uri) {

  router.use(uri, function(req, res, next) {
    // Shitty method override because the integrations page
    // doesn't use javascript and relies on forms aka, the web as of 1996.
    var _method = req.body && req.body._method ? '' + req.body._method : '';
    if (req.method === 'POST' && _method.toLowerCase() === 'delete') {
      req.method = 'DELETE';
    }
    next();
  });

  router.get(uri,
    ensureLoggedIn,
    identifyRoute('settings-room-get'),
    uriContextResolverMiddleware({ create: false }),
    adminAccessCheck,
    getIntegrations);

  router.delete(uri,
    ensureLoggedIn,
    identifyRoute('settings-room-delete'),
    uriContextResolverMiddleware({ create: false }),
    adminAccessCheck,
    deleteIntegration);

  router.post(uri,
    ensureLoggedIn,
    identifyRoute('settings-room-create'),
    uriContextResolverMiddleware({ create: false }),
    adminAccessCheck,
    createIntegration);
});

router.get('/unsubscribe/:hash',
  identifyRoute('settings-unsubscribe'),
  function (req, res, next) {
    var plaintext;
    try {
      var decipher = crypto.createDecipher('aes256', passphrase);
      plaintext = decipher.update(req.params.hash, 'hex', 'utf8') + decipher.final('utf8');
    } catch(err) {
      return next(new StatusError(400, 'Invalid hash'));
    }

    var parts = plaintext.split(',');
    var userId = parts[0];
    var notificationType = parts[1];

    debug("User %s opted-out from ", userId, notificationType);
    stats.event('unsubscribed_unread_notifications', { userId: userId });

    userSettingsService.setUserSettings(userId, 'unread_notifications_optout', 1)
      .then(function() {
        var msg = "Done. You won't receive notifications like that one in the future.";

        res.render('unsubscribe', { layout: 'generic-layout', title: 'Unsubscribe', msg: msg });
      })
      .catch(next);

  });

router.get('/badger/opt-out',
  ensureLoggedIn,
  identifyRoute('settings-badger-optout'),
  function (req, res, next) {
    var userId = req.user.id;

    logger.info("User " + userId + " opted-out from auto badgers");
    stats.event('optout_badger', { userId: userId });

    return userSettingsService.setUserSettings(userId, 'badger_optout', 1)
      .then(function() {
        var msg = "Done. We won't send you automatic pull-requests in future.";

        res.render('unsubscribe', {
          layout: 'generic-layout',
          title: 'Opt-out',
          msg: msg
        });
      })
      .catch(next);
  });

module.exports = router;
