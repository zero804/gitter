"use strict";

var express = require('express');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/~learn',
  ensureLoggedIn,
  identifyRoute('learn-frame'),
  function(req, res) {
    res.render('learn');
  });

module.exports = router;
