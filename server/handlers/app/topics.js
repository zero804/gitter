"use strict";

var express = require('express');
var topicsRenderers = require('../renderers/topics');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var featureToggles = require('../../web/middlewares/feature-toggles');

var router = express.Router({ caseSensitive: true, mergeParams: true });

router.get('/',
  identifyRoute('forum'),
  featureToggles,
  function(req, res, next){
    return topicsRenderers.renderForum(req, res, next);
  }
);

router.get('/categories/:categoryName',
  identifyRoute('forum'),
  featureToggles,
  function(req, res, next){
    return topicsRenderers.renderForum(req, res, next);
  }
);

router.get('/create-topic',
  identifyRoute('create-topic'),
  featureToggles,
  function(req, res, next){
    return topicsRenderers.renderForum(req, res, next, {
      createTopic: true
    });
  }
);

router.get('/topic/:topicId/:topicSlug',
  identifyRoute('topic'),
  featureToggles,
  function(req, res, next){
    return topicsRenderers.renderTopic(req, res, next);
  }
);

module.exports = router;
