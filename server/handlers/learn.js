"use strict";

var express = require('express');
var ensureLoggedIn = require('../web/middlewares/ensure-logged-in');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/~learn',
  ensureLoggedIn,
  function(req, res) {
    res.render('learn');
  });

module.exports = router;
