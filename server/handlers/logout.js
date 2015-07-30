"use strict";

var express       = require('express');
var nconf         = require('../utils/config');
var logout        = require('../web/middlewares/logout');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/',
  identifyRoute('logout'),
  function(req, res, next) {
    next(405);
  });

router.post('/',
  identifyRoute('logout-post'),
  logout,
  function(req, res) {
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
