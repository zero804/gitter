/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var _                 = require("underscore");
var nconf             = require('../../utils/config');
var contextGenerator  = require('../../web/context-generator');

function getAppCache(req) {
  if(!nconf.get('web:useAppCache')) return;
  return req.url + '.appcache';
}

function renderHomePage(req, res, next) {
  contextGenerator.generateMiniContext(req, function(err, troupeContext) {
    if(err) return next(err);

    var page, bootScriptName;

    var user = req.user;
    if(req.isPhone) {
      page = 'mobile/mobile-app';
      bootScriptName = 'mobile-userhome';
    } else {
      page = 'app-template';
      bootScriptName = user ? 'router-homepage' : 'router-login';
    }

    res.render(page, {
      useAppCache: !!nconf.get('web:useAppCache'),
      bootScriptName: bootScriptName,
      troupeName: (user && user.displayName) || '',
      troupeContext: troupeContext,
      agent: req.headers['user-agent'],
      isUserhome: true
    });
  });
}

function renderAppPageWithTroupe(req, res, next, page) {
  var user = req.user;
  var accessDenied =  false; //!req.uriContext.access;

  contextGenerator.generateTroupeContext(req)
    .then(function(troupeContext) {
      var login = !user || accessDenied;

      var bootScript;
      if(login) {
        bootScript = 'router-login';
      } else {
        bootScript = req.isPhone ? 'mobile-app' : 'router-app';
      }

      res.render(page, {
        appCache: getAppCache(req),
        login: login,
        bootScriptName: bootScript,
        troupeName: troupeContext.troupe.uri || troupeContext.troupe.name,
        troupeContext: troupeContext,
        agent: req.headers['user-agent']
      });
    })
    .fail(next);
}


function renderAcceptInvitePage(req, res, next) {
  contextGenerator.generateMiniContext(req, function(err, troupeContext) {
    if(err) {
      next(err);
    } else {
      res.render('app-template', {
        useAppCache: !!nconf.get('web:useAppCache'),
        bootScriptName: 'router-login',
        troupeName: 'Invite',
        troupeContext: _.extend(troupeContext, {
          acceptInvitePrompt: true
        }),
        agent: req.headers['user-agent']
      });
    }
  });
}

function renderMiddleware(template, mobilePage) {
  return function(req, res, next) {
    if(mobilePage) req.params.mobilePage = mobilePage;
    renderAppPageWithTroupe(req, res, next, template);
  };
}

module.exports = exports = {
  renderHomePage: renderHomePage,
  renderAppPageWithTroupe: renderAppPageWithTroupe,
  renderAcceptInvitePage: renderAcceptInvitePage,
  renderMiddleware: renderMiddleware
};
