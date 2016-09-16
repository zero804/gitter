"use strict";

var express = require('express');
var StatusError = require('statuserror');
var topicsRenderers = require('../renderers/topics');
var mainFrameRenderers = require('../renderers/main-frame');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var featureToggles = require('../../web/middlewares/feature-toggles');
var isPhoneMiddleware = require('../../web/middlewares/is-phone');

var router = express.Router({ caseSensitive: true, mergeParams: true });

//Main frame renderer for topic
router.get('/',
  identifyRoute('forum'),
  featureToggles,
  isPhoneMiddleware,
  function(req, res, next){

    //No switch, no business
    if (!req.fflip || !req.fflip.has('topics')) {
      return next(new StatusError(404));
    }

    var renderer = mainFrameRenderers.renderMainFrame
    if (req.isPhone) {
      renderer = mainFrameRenderers.renderMobileMainFrame;
    }

    return renderer(req, res, next, {
      subFrameLocation: '/' + req.params.groupName + '/topics/~topics'
    });
  }
);

//Render the topics view
router.get('/~topics',
  identifyRoute('forum-embeded'),
  featureToggles,
  function(req, res, next){

    //No switch, no business
    if (!req.fflip || !req.fflip.has('topics')) {
      return next(new StatusError(404));
    }

    return topicsRenderers.renderForum(req, res, next);
  }
);

router.get('/categories/:categoryName',
  identifyRoute('forum'),
  featureToggles,
  function(req, res, next){

    //No switch, no business
    if (!req.fflip || !req.fflip.has('topics')) {
      return next(new StatusError(404));
    }

    return mainFrameRenderers.renderMainFrame(req, res, next, {
      subFrameLocation: '/' + req.params.groupName + '/topics/categories/' + req.params.categoryName + '/~topics'
    });
  }
);

router.get('/categories/:categoryName/~topics',
  identifyRoute('forum-embedded'),
  featureToggles,
  function(req, res, next){

    //No switch, no business
    if (!req.fflip || !req.fflip.has('topics')) {
      return next(new StatusError(404));
    }

    return topicsRenderers.renderForum(req, res, next);
  }
);

router.get('/create-topic',
  identifyRoute('create-topic'),
  featureToggles,
  function(req, res, next){

    //No switch, no business
    if (!req.fflip || !req.fflip.has('topics')) {
      return next(new StatusError(404));
    }

    return mainFrameRenderers.renderMainFrame(req, res, next, {
      subFrameLocation: '/' + req.params.groupName + '/topics/create-topic/~topics'
    });
  }
);

router.get('/create-topic/~topics',
  identifyRoute('create-topic-embeded'),
  featureToggles,
  function(req, res, next){

    //No switch, no business
    if (!req.fflip || !req.fflip.has('topics')) {
      return next(new StatusError(404));
    }

    return topicsRenderers.renderForum(req, res, next, {
      createTopic: true
    });
  }
);

router.get('/topic/:topicId/:topicSlug',
  identifyRoute('topic'),
  featureToggles,
  function(req, res, next){

    //No switch, no business
    if (!req.fflip || !req.fflip.has('topics')) {
      return next(new StatusError(404));
    }

    return mainFrameRenderers.renderMainFrame(req, res, next, {
      subFrameLocation: '/' + req.params.groupName + '/topics/topic/' + req.params.topicId + '/' + req.params.topicSlug + '/~topics'
    });
  }
);

router.get('/topic/:topicId/:topicSlug/~topics',
  identifyRoute('topic-embedded'),
  featureToggles,
  function(req, res, next){

    //No switch, no business
    if (!req.fflip || !req.fflip.has('topics')) {
      return next(new StatusError(404));
    }

    return topicsRenderers.renderTopic(req, res, next);
  }
);

module.exports = router;
