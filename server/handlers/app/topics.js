"use strict";

var express = require('express');
var StatusError = require('statuserror');
var topicsRenderers = require('../renderers/topics');
var mainFrameRenderers = require('../renderers/main-frame');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var featureToggles = require('../../web/middlewares/feature-toggles');
var isPhoneMiddleware = require('../../web/middlewares/is-phone');
var contextGenerator = require('../../web/context-generator.js');

var router = express.Router({ caseSensitive: true, mergeParams: true });

//Main frame renderer for topic
router.get('/',
  identifyRoute('forum'),
  featureToggles,
  isPhoneMiddleware,
  function(req, res, next){
    var renderer = mainFrameRenderers.renderMainFrame
    if (req.isPhone) {
      renderer = mainFrameRenderers.renderMobileMainFrame;
    }

    return renderer(req, res, next, {
      subFrameLocation: '/' + req.params.groupUri + '/topics/~topics'
    });
  }
);

//Render the topics view
router.get('/~topics',
  identifyRoute('forum-embeded'),
  featureToggles,
  function(req, res, next){
    return topicsRenderers.renderForum(req, res, next);
  }
);

router.get('/categories/:categoryName',
  identifyRoute('forum'),
  featureToggles,
  isPhoneMiddleware,
  function(req, res, next){
    var renderer = mainFrameRenderers.renderMainFrame
    if (req.isPhone) {
      renderer = mainFrameRenderers.renderMobileMainFrame;
    }
    return renderer(req, res, next, {
      subFrameLocation: '/' + req.params.groupUri + '/topics/categories/' + req.params.categoryName + '/~topics'
    });
  }
);

router.get('/categories/:categoryName/~topics',
  identifyRoute('forum-embedded'),
  featureToggles,
  function(req, res, next){
    return topicsRenderers.renderForum(req, res, next);
  }
);

router.get('/create-topic',
  identifyRoute('create-topic'),
  featureToggles,
  isPhoneMiddleware,
  function(req, res, next) {

    var renderer = mainFrameRenderers.renderMainFrame
    if (req.isPhone) {
      renderer = mainFrameRenderers.renderMobileMainFrame;
    }

    return contextGenerator.generateMainMenuContext(req)
      .then(function(context) {
        var user = context.user;
        var isSignedIn = !!user;

        if(!isSignedIn) {
          return res.redirect('/login');
        }

        return renderer(req, res, next, {
          subFrameLocation: '/' + req.params.groupUri + '/topics/create-topic/~topics'
        });
      });
  }
);

router.get('/create-topic/~topics',
  identifyRoute('create-topic-embeded'),
  featureToggles,
  function(req, res, next){
    return contextGenerator.generateMainMenuContext(req)
      .then(function(context) {
        var user = context.user;
        var isSignedIn = !!user;

        if(!isSignedIn) {
          return res.redirect('/login');
        }

        return topicsRenderers.renderForum(req, res, next, {
          createTopic: true
        });
      });
  }
);

router.get('/topic/:topicId/:topicSlug',
  identifyRoute('topic'),
  featureToggles,
  isPhoneMiddleware,
  function(req, res, next){
    var renderer = mainFrameRenderers.renderMainFrame
    if (req.isPhone) {
      renderer = mainFrameRenderers.renderMobileMainFrame;
    }
    return renderer(req, res, next, {
      subFrameLocation: '/' + req.params.groupUri + '/topics/topic/' + req.params.topicId + '/' + req.params.topicSlug + '/~topics'
    });
  }
);

router.get('/topic/:topicId/:topicSlug/~topics',
  identifyRoute('topic-embedded'),
  featureToggles,
  function(req, res, next){
    return topicsRenderers.renderTopic(req, res, next);
  }
);

module.exports = router;
