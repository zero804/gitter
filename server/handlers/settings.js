"use strict";

var env                          = require('gitter-web-env');
var logger                       = env.logger;
var stats                        = env.stats;
var config                       = env.config;
var express                      = require('express');
var ensureLoggedIn               = require('../web/middlewares/ensure-logged-in');
var crypto                       = require('crypto');
var userSettingsService          = require('../services/user-settings-service');
var passphrase                   = config.get('email:unsubscribeNotificationsSecret');
var roomPermissionsModel         = require('../services/room-permissions-model');
var request                      = require('request');
var uriContextResolverMiddleware = require('./app/middleware').uriContextResolverMiddleware;
var jwt                          = require('jwt-simple');
var cdn                          = require('../web/cdn');
var services                     = require('gitter-services');

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
  var url = config.get('webhooks:basepath')+'/troupes/' + req.troupe.id + '/hooks';
  logger.info('requesting hook list at ' + url);
  request.get({
    url: url,
    json: true
  }, function(err, resp, hooks) {
    if(err || resp.statusCode != 200 || !Array.isArray(hooks)) {
      logger.error('failed to fetch hooks for troupe', { exception: err, resp: resp, hooks: hooks});
      res.status(500).send('Unable to perform request. Please try again later.');
      return;
    }
    logger.info('hook list received', { hooks: hooks });

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
    url: config.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks/' + req.body.id,
    json: true
  },
  function(err, resp) {
    if(err || resp.statusCode != 200) {
      logger.error('failed to delete hook for troupe', { exception: err, resp: resp });
      res.status(500).send('Unable to perform request. Please try again later.');
      return;
    }

    res.redirect('/settings/integrations/' + req.troupe.uri);
  });

}

function createIntegration(req, res) {

  request.post({
    url: config.get('webhooks:basepath') + '/troupes/' + req.troupe.id + '/hooks',
    json: {
      service: req.body.service,
      endpoint: 'gitter'
    }
  },

  function(err, resp, body) {
    if(err || resp.statusCode != 200 || !body) {
      logger.error('failed to create hook for troupe', { exception: err, resp: resp });
      res.status(500).send('Unable to perform request. Please try again later.');
      return;
    }

    var encryptedUserToken;

    // Pass through the token if we have write access
    // TODO: deal with private repos too
    if(req.user.hasGitHubScope('public_repo')) {
      encryptedUserToken = jwt.encode(req.user.getGitHubToken('public_repo'), config.get('jwt:secret'));
    } else {
      encryptedUserToken = "";
    }

    res.redirect(body.configurationURL +
      "&rt=" + resp.body.token +
      "&ut=" + encryptedUserToken +
      "&returnTo=" + config.get('web:basepath') + req.url
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

var router = express.Router({ caseSensitive: true, mergeParams: true });

[
  '/integrations/:roomPart1',
  '/integrations/:roomPart1/:roomPart2',
  '/integrations/:roomPart1/:roomPart2/:roomPart3'
].forEach(function(uri) {

  router.get(uri,
    ensureLoggedIn,
    uriContextResolverMiddleware({ create: false }),
    adminAccessCheck,
    getIntegrations);

  router.delete(uri,
    ensureLoggedIn,
    uriContextResolverMiddleware({ create: false }),
    adminAccessCheck,
    deleteIntegration);

  router.post(uri,
    ensureLoggedIn,
    uriContextResolverMiddleware({ create: false }),
    adminAccessCheck,
    createIntegration);
});

router.get('/unsubscribe/:hash', function (req, res, next) {
  var plaintext;

  try {
    var decipher  = crypto.createDecipher('aes256', passphrase);
    plaintext     = decipher.update(req.params.hash, 'hex', 'utf8') + decipher.final('utf8');
  } catch(err) {
    res.status(400).send('Invalid hash');
    return;
  }

  var parts             = plaintext.split(',');
  var userId            = parts[0];
  var notificationType  = parts[1];

  logger.info("User " + userId + " opted-out from " + notificationType);
  stats.event('unsubscribed_unread_notifications', {userId: userId});

  userSettingsService.setUserSettings(userId, 'unread_notifications_optout', 1)
    .then(function () {
      var msg = "Done. You wont receive notifications like that one in the future.";

      res.render('unsubscribe', { layout: 'generic-layout', title: 'Unsubscribe', msg: msg });
    })
    .fail(next);

});

router.get('/badger/opt-out',
  ensureLoggedIn,
  function (req, res, next) {
    var userId = req.user.id;

    logger.info("User " + userId + " opted-out from auto badgers");
    stats.event('optout_badger', { userId: userId });

    return userSettingsService.setUserSettings(userId, 'badger_optout', 1)
      .then(function () {
        var msg = "Done. We won't send you automatic pull-requests in future.";

        res.render('unsubscribe', {
          layout: 'generic-layout',
          title: 'Opt-out',
          msg: msg
        });
      })
      .fail(next);
  });

module.exports = router;
