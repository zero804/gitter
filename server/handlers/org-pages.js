"use strict";

var express = require('express');
var appMiddleware = require('./app/middleware');
var appRender = require('./app/render');
var featureToggles = require('../web/middlewares/feature-toggles');

var router = express.Router({ caseSensitive: true, mergeParams: true });

function renderOrgPage(req, res, next) {
  req.uriContext = {
    uri: req.params.orgName
  };

  appRender.renderOrgPage(req, res, next);
}


function renderOrgPageInFrame(req, res, next) {
  req.uriContext = {
    uri: 'orgs/' + req.params.orgName + '/rooms'
  };

  if (req.isPhone) return renderOrgPage(req, res, next);

  appRender.renderMainFrame(req, res, next, 'iframe');
}

router.get('/:orgName/rooms',
           featureToggles,
           appMiddleware.isPhoneMiddleware,
           renderOrgPageInFrame);

router.get('/:orgName/rooms/~iframe',
           featureToggles,
           appMiddleware.isPhoneMiddleware,
           renderOrgPage);

module.exports = router;
