"use strict";

var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var gravatar = require('gitter-web-avatars/server/gravatar');
var Group = require('gitter-web-persistence').Group;
var router = express.Router({ caseSensitive: true, mergeParams: true });

var DEFAULT_AVATAR_URL = 'https://avatars.githubusercontent.com/u/0';

function sendAvatar(req, res, imageUrl, hasCacheBuster) {

  // If the nginx image proxy is sitting in front of the app
  // use that
  if (req.headers['x-avatar-server']) {
    if (hasCacheBuster) {
      res.set('X-Accel-Redirect', '/fetch_lt/' + imageUrl);
    } else {
      res.set('X-Accel-Redirect', '/fetch/' + imageUrl);
    }
    res.sendStatus(200).send('OK');
    return;
  }

  // No image proxy, in the development environment
  if (hasCacheBuster) {
    res.set('Cache-Control', 'max-age=2592000'); // TODO: add more here
  } else {
    res.set('Cache-Control', 'max-age=3600'); // TODO: add more here
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

function githubVerionedUrl(username, version, size) {
  if (!version) {
    return githubUrl(username, size);
  }

  var base = 'https://avatars.githubusercontent.com/' + username + '?v=' + version;
  if (size) {
    base = base + '&s=' + size;
  }

  return base;
}

/**
 * Group Avatars, by ID
 */
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

          // Add non-github avatars in here
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
    var gravatarUrl = gravatar.forEmail(email, req.query.s);
    sendAvatar(req, res, gravatarUrl, true);
  });

router.get('/gravatar/m/:md5',
  identifyRoute('api-private-avatar-checksum'),
  function(req, res) {
    var md5 = req.params.md5;
    var gravatarUrl = gravatar.forChecksum(md5, req.query.s);
    sendAvatar(req, res, gravatarUrl, true);
  });

router.get('/gh/u/:username',
  identifyRoute('api-private-github-username'),
  function(req, res) {
    var username = req.params.username;
    var size = req.query.size && parseInt(req.query.size, 10) || '';
    var avatarUrl = githubUrl(username, size);
    sendAvatar(req, res, avatarUrl, false);
  });

router.get('/gh/uv/:version/:username',
  identifyRoute('api-private-github-versioned-username'),
  function(req, res) {
    var username = req.params.username;
    var version = req.params.version;
    var size = req.query.size && parseInt(req.query.size, 10) || '';
    var avatarUrl = githubVerionedUrl(username, version, size);
    sendAvatar(req, res, avatarUrl, false);
  });


module.exports = router;
