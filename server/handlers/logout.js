"use strict";

var express = require('express');
var nconf = require('../utils/config');
var logout = require('../web/middlewares/logout');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/', function(req, res, next) {
  next(405);
});

router.post('/', logout, function(req, res) {
  res.format({
    text: function(){
      res.send('OK');
    },

    html: function(){
      res.relativeRedirect(nconf.get('web:homeurl'));
    },

    json: function(){
      res.send({ success:true, redirect: nconf.get('web:homeurl') });
    }
  });
});

module.exports = router;
