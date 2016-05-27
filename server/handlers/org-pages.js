"use strict";

var express = require('express');
var appMiddleware = require('./app/middleware');
var appRender = require('./app/render');
var renderOrg = require('./app/render/org');
var featureToggles = require('../web/middlewares/feature-toggles');

var router = express.Router({ caseSensitive: true, mergeParams: true });

function handleOrgPage(req, res, next) {
  req.uriContext = {
    uri: req.params.orgName
  };

  renderOrg.renderOrgPage(req, res, next);
}

function handleOrgPageInFrame(req, res, next) {
  req.uriContext = {
    uri: 'orgs/' + req.params.orgName + '/rooms'
  };

  if (req.isPhone) return handleOrgPage(req, res, next);

  appRender.renderMainFrame(req, res, next, 'iframe');
}

router.get('/:orgName/rooms',
           featureToggles,
           appMiddleware.isPhoneMiddleware,
           handleOrgPageInFrame);

router.get('/:orgName/rooms/~iframe',
  featureToggles,
  appMiddleware.isPhoneMiddleware,
  handleOrgPage);

module.exports = router;
