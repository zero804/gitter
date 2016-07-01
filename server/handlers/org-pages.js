"use strict";

var express = require('express');
var isPhoneMiddleware = require('../web/middlewares/is-phone');
var groupContextResolverMiddleware = require('./uri-context/group-context-resolver-middleware');
var mainFrameRenderer = require('./renderers/main-frame');
var renderOrg = require('./renderers/org');
var featureToggles = require('../web/middlewares/feature-toggles');
var StatusError = require('statuserror');
var identifyRoute = require('gitter-web-env').middlewares.identifyRoute;
var router = express.Router({ caseSensitive: true, mergeParams: true });

function handleOrgPage(req, res, next) {
  if (!req.group) throw new StatusError(404);
  renderOrg.renderOrgPage(req, res, next);
}

function handleOrgPageInFrame(req, res, next) {
  if (!req.group) throw new StatusError(404);

  if (req.isPhone) {
    return handleOrgPage(req, res, next);
  }

  mainFrameRenderer.renderMainFrame(req, res, next, {
    subFrameLocation: '/orgs/' + req.group.uri + '/rooms/~iframe',
    title: req.group.uri
    // TODO: add social meta data
  });
}

router.get('/:groupUri/rooms',
  identifyRoute('group-rooms-mainframe'),
  featureToggles,
  groupContextResolverMiddleware,
  handleOrgPageInFrame);

router.get('/:groupUri/rooms/~iframe',
  identifyRoute('group-rooms-frame'),
  featureToggles,
  isPhoneMiddleware,
  groupContextResolverMiddleware,
  handleOrgPage);

module.exports = router;
