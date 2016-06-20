"use strict";

var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var gravatar = require('../../../utils/gravatar');
var Group = require('gitter-web-persistence').Group;
var router = express.Router({ caseSensitive: true, mergeParams: true });

var DEFAULT_AVATAR_URL = 'https://avatars.githubusercontent.com/u/0';

function sendAvatar(req, res, imageUrl, hasCacheBuster) {
  if (hasCacheBuster) {
    res.set('Cache-Control', 'public, max-age=600, s-maxage=600'); // TODO: add more here
  } else {
    res.set('Cache-Control', 'public, max-age=60, s-maxage=60'); // TODO: add more here
  }

  // If the nginx image proxy is sitting in front of the app
  // use that
  if (req.headers['x-avatar-server']) {
    res.set('X-Accel-Redirect', '/fetch/' + imageUrl);
    res.sendStatus(200).send('OK');
    return;
  }

  res.redirect(imageUrl);
  return;
}

function githubUrl(username, size) {
  var base = 'https://avatars.githubusercontent.com/' + username;
  if (size) {
    base = base + '?s=' + size;
  }

  return base;
}

router.get('/group/i/:groupId',
  identifyRoute('api-private-avatar-group-id'),
  function(req, res, next) {
    var size = req.query.size && parseInt(req.query.size, 10) || '';

    // TODO: deal with cache-busters
    // and non-github objects

    return Group.findById(req.params.groupId, { 'sd.type': 1, 'sd.linkPath': 1 })
      .then(function(group) {
        if (!group) {
          sendAvatar(req, res, DEFAULT_AVATAR_URL, false);
        }

        var type = group.sd && group.sd.type;
        var linkPath = group.sd && group.sd.linkPath;

        switch(type) {
          case 'GH_ORG':
          case 'GH_USER':
            sendAvatar(req, res, githubUrl(linkPath, size), false);
            return;

          case 'GH_REPO':
            sendAvatar(req, res, githubUrl(linkPath.split('/')[0], size), false);
            return;

          default:
            sendAvatar(req, res, DEFAULT_AVATAR_URL, false);
        }
      })
      .catch(next);
  });


router.get('/gravatar/e/:email',
  identifyRoute('api-private-avatar-gravatar'),
  function(req, res) {
    var email = req.params.email;
    var gravatarUrl = gravatar(email, req.query.s);
    sendAvatar(req, res, gravatarUrl, true);
  });

module.exports = router;
