"use strict";

var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var gravatar = require('gitter-web-avatars/server/gravatar');

var router = express.Router({ caseSensitive: true, mergeParams: true });

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
    sendAvatar(req, res, 'https://avatars.githubusercontent.com/' + username, true);
  });


module.exports = router;
