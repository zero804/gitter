"use strict";

var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var gravatar = require('gitter-web-avatars/server/gravatar');
var Group = require('gitter-web-persistence').Group;
var User = require('gitter-web-persistence').User;
var avatars = require('gitter-web-avatars');
var router = express.Router({ caseSensitive: true, mergeParams: true });
var isGitHubUsername = require('gitter-web-identity/lib/is-github-username');
var fixMongoIdQueryParam = require('../../../web/fix-mongo-id-query-param');
var url = require('url');

var DEFAULT_AVATAR_URL = avatars.getDefault();
var DEFAULT_SIZE = 128;

function getSizeParam(req) {
  return req.query.s && parseInt(req.query.s, 10) || DEFAULT_SIZE;
}

function sendAvatar(req, res, imageUrl, hasCacheBuster) {

  // If the nginx image proxy is sitting in front of the app
  // use that
  if (req.headers['x-avatar-server']) {
    if (hasCacheBuster) {
      res.set('X-Accel-Redirect', '/fetch_lt/' + imageUrl);
    } else {
      res.set('X-Accel-Redirect', '/fetch/' + imageUrl);
    }
    res.send('OK');
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

function addSizeParam(avatarUrl, sizeParamName, sizeValue) {
  if (!sizeValue) return avatarUrl;
  var parsed = url.parse(avatarUrl, true);
  parsed.search = null;
  parsed.query[sizeParamName] = sizeValue;
  return url.format(parsed);
}

/**
 * Group Avatars, by ID
 */
router.get('/group/i/:groupId',
  identifyRoute('api-private-avatar-group-id'),
  function(req, res, next) {
    var size = getSizeParam(req);
    // TODO: deal with cache-busters
    // and non-github objects
    var groupId = fixMongoIdQueryParam(req.params.groupId);

    if (!groupId) {
      return sendAvatar(req, res, DEFAULT_AVATAR_URL, false);
    }

    return Group.findById(groupId, { 'sd.type': 1, 'sd.linkPath': 1 }, { lean: true })
      .then(function(group) {
        if (!group) {
          return sendAvatar(req, res, DEFAULT_AVATAR_URL, false);
        }

        var type = group.sd && group.sd.type;
        var linkPath = group.sd && group.sd.linkPath;

        switch(type) {
          case 'GH_ORG':
          case 'GH_USER':
            return sendAvatar(req, res, githubUrl(linkPath, size), false);

          case 'GH_REPO':
            return sendAvatar(req, res, githubUrl(linkPath.split('/')[0], size), false);

          // Add non-github avatars in here
          default:
            return sendAvatar(req, res, DEFAULT_AVATAR_URL, false);
        }
      })
      .catch(next);
  });

/* Case sensitive */
router.get('/g/u/:username',
  identifyRoute('api-private-avatar-gitter-username'),
  function(req, res, next) {
    var size = getSizeParam(req);
    var username = req.params.username;

    if (!username) {
      return sendAvatar(req, res, DEFAULT_AVATAR_URL, false);
    }

    return User.findOne({ username: username }, { _id: 0, gravatarImageUrl: 1 }, { lean: true })
      .then(function(doc) {
        if (!doc || !doc.gravatarImageUrl) {
          // We don't know who this user is. Just fallback to GitHub for now
          var fallback = githubUrl(username, size);
          return sendAvatar(req, res, fallback, false);
        }

        if (isGitHubUsername(username)) {
          var url = addSizeParam(doc.gravatarImageUrl, 's', size);
          return sendAvatar(req, res, url, false);
        }

        // TODO: Deal with twitter users better (for example sizes etc)
        return sendAvatar(req, res, doc.gravatarImageUrl, false);
      })
      .catch(next);

  });


router.get('/gravatar/e/:email',
  identifyRoute('api-private-avatar-gravatar'),
  function(req, res) {
    var size = getSizeParam(req);

    var email = req.params.email;
    var gravatarUrl = gravatar.forEmail(email, size);
    return sendAvatar(req, res, gravatarUrl, true);
  });

router.get('/gravatar/m/:md5',
  identifyRoute('api-private-avatar-checksum'),
  function(req, res) {
    var size = getSizeParam(req);
    var md5 = req.params.md5;
    var gravatarUrl = gravatar.forChecksum(md5, size);
    return sendAvatar(req, res, gravatarUrl, true);
  });

/**
 * Only used in DEV. Otherwise nginx handles this route
 */
router.get('/gh/u/:username',
  identifyRoute('api-private-github-username'),
  function(req, res) {
    var username = req.params.username;
    var size = getSizeParam(req);
    var avatarUrl = githubUrl(username, size);
    return sendAvatar(req, res, avatarUrl, false);
  });

/**
 * Only used in DEV. Otherwise nginx handles this route
 */
router.get('/gh/uv/:version/:username',
  identifyRoute('api-private-github-versioned-username'),
  function(req, res) {
    var username = req.params.username;
    var version = req.params.version;
    var size = req.query.s && parseInt(req.query.s, 10) || '';
    var avatarUrl = githubVerionedUrl(username, version, size);
    return sendAvatar(req, res, avatarUrl, false);
  });

/* Default route for anything else on the avatar server */
router.use(
  identifyRoute('api-private-missing-avatar'),
  function(req, res) {

    // If the nginx image proxy is sitting in front of the app
    // use that
    if (req.headers['x-avatar-server']) {
      res.set('X-Accel-Redirect', '/missing');
      res.send('OK');
      return;
    }

    // Deliberately don't fall back in development
    // since we want to know that the image is broken...
    res.set('Cache-Control', 'max-age=60');
    res.status(404).send('Not Found');
})

module.exports = router;
