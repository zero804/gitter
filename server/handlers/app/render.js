/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf             = require('../../utils/config');
var contextGenerator  = require('../../web/context-generator');
var assert            = require('assert');

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
      bootScriptName = 'userhome';
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


function renderMainFrame(req, res, next, frame) {

  contextGenerator.generateMiniContext(req)
    .then(function(troupeContext) {
      var bootScript, pageTemplate, chatAppLocation;
      bootScript = req.isPhone ? 'mobile-app' : 'router-app';
      pageTemplate = 'app-template';
      if(req.uriContext.uri.indexOf('/') >= 0) {
        chatAppLocation = '/' + req.uriContext.uri + '/' + frame;
      } else {
        chatAppLocation = '/' + req.uriContext.uri + '/-/' + frame;
      }

      var troupe = req.uriContext.troupe;

      res.render(pageTemplate, {
        appCache: getAppCache(req),
        bootScriptName: bootScript,
        troupeName: troupe && (troupe.uri || troupe.name),
        troupeContext: troupeContext,
        chatAppLocation: chatAppLocation,
        agent: req.headers['user-agent']
      });
    })
    .fail(next);
}

function renderAppPageWithTroupe(req, res, next, page) {

  contextGenerator.generateTroupeContext(req)
    .then(function(troupeContext) {
      var bootScript;
      var pageTemplate;
      var chatAppLocation;
      switch(page) {
        case 'app':
          bootScript = req.isPhone ? 'mobile-app' : 'router-app';
          pageTemplate = 'app-template';
          if(req.uriContext.uri.indexOf('/') >= 0) {
            chatAppLocation = '/' + req.uriContext.uri + '/chat';
          } else {
            chatAppLocation = '/' + req.uriContext.uri + '/-/chat';
          }

          // if(req.isPhone) {
          //   // TODO: this should change from chat-app to a seperate mobile app
          //   appRender.renderAppPageWithTroupe(req, res, next, 'mobile/mobile-app');
          // } else {
          //   appRender.renderAppPageWithTroupe(req, res, next, 'app');
          // }

          break;
        case 'chat':
          bootScript = 'router-chat';
          pageTemplate = 'chat-template';

          break;
        case 'home':
          // TODO: In future....
        default:
          assert(false, 'Unknown page: ' + page);
      }

      res.render(pageTemplate, {
        appCache: getAppCache(req),
        bootScriptName: bootScript,
        troupeName: troupeContext.troupe.uri || troupeContext.troupe.name,
        troupeTopic: troupeContext.troupe.topic,
        troupeFavourite: troupeContext.troupe.favourite,
        user: troupeContext.user,
        troupeContext: troupeContext,
        chatAppLocation: chatAppLocation,
        agent: req.headers['user-agent']
      });
    })
    .fail(next);
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
  renderMainFrame: renderMainFrame,
  renderMiddleware: renderMiddleware
};
