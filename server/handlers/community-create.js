"use strict";

var Promise = require('bluebird');
var _ = require('underscore');
var langs = require('langs');
var express = require('express');
var urlJoin = require('url-join');

var clientEnv = require('gitter-client-env');
var contextGenerator = require('../web/context-generator');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;


var router = express.Router({ caseSensitive: true, mergeParams: true });


router.get('/*',
  identifyRoute('create-community'),
  function (req, res) {
    contextGenerator.generateNonChatContext(req).then(function(troupeContext) {
      res.render('community-create', {
        troupeContext: troupeContext
      });
    });
  });


module.exports = router;
