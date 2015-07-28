"use strict";

var appMiddleware      = require('./app/middleware');
var appRender          = require('./app/render');

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

  appRender.renderMainFrame(req, res, next, 'iframe');
}

module.exports = {
  install: function(app) {
    app.get('/orgs/:orgName/rooms', appMiddleware.isPhoneMiddleware, renderOrgPageInFrame);
    app.get('/orgs/:orgName/rooms/~iframe', appMiddleware.isPhoneMiddleware, renderOrgPage);
  }
};
