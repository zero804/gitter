"use strict";

var express = require('express');
var isPhoneMiddleware = require('../web/middlewares/is-phone');
var mainFrameRenderer = require('./renderers/main-frame');
var renderOrg = require('./renderers/org');
var featureToggles = require('../web/middlewares/feature-toggles');

var router = express.Router({ caseSensitive: true, mergeParams: true });

function handleOrgPage(req, res, next) {
  renderOrg.renderOrgPage(req, res, next, {
    orgUri: req.params.orgName
  });
}

function handleOrgPageInFrame(req, res, next) {
  if (req.isPhone) {
    return handleOrgPage(req, res, next);
  }

  mainFrameRenderer.renderMainFrame(req, res, next, 'iframe');
}

router.get('/:orgName/rooms',
  featureToggles,
  isPhoneMiddleware,
  handleOrgPageInFrame);

router.get('/:orgName/rooms/~iframe',
  featureToggles,
  isPhoneMiddleware,
  handleOrgPage);

module.exports = router;
