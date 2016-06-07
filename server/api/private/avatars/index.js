"use strict";

var express = require('express');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var gravatar = require('../../../utils/gravatar');

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
    var gravatarUrl = gravatar(email, req.query.s);
    sendAvatar(req, res, gravatarUrl, true);
  });

module.exports = router;
