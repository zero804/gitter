"use strict";

var env        = require('gitter-web-env');
var config     = env.config;
var _          = require('lodash');
var userScopes = require('gitter-web-identity/lib/user-scopes');

function linkStack(stack) {
  if(!stack) return;
  return stack.split(/\n/).map(function(i) {
    return i.replace(/\(([^:]+):(\d+):(\d+)\)/, function(match, file, line, col) {
      var ourCode = file.indexOf('node_modules') == -1;
      var h = "(<a href='atm://open/?url=file://" + file + "&line=" + line + "&column=" + col + "'>" + file + ":" + line + ":" + col + "</a>)";
      if(ourCode) h = "<b>" + h + "</b>";
      return h;
    });
  }).join('\n');
}

function getTemplateForStatus(status) {
  switch(status) {
    case 402:
    case 404:
      return '' + status;

    default:
      return '500';
  }
}
/* Has to have four args */
module.exports = function(err, req, res, next) { // eslint-disable-line no-unused-vars
  var status = res.statusCode;

  /* Got a 401, the user isn't logged in and this is a browser? */
  if(status === 401 && req.accepts(['json','html']) === 'html' && !req.user) {
    var returnUrl = req.originalUrl.replace(/\/~(\w+)$/,"");

    if(req.session) {
      req.session.returnTo = returnUrl;
      res.redirect('/login');
    } else {
      // This should not really be happening but
      // may do if the gitter client isn't doing
      // oauth properly
      res.redirect('/login?returnTo=' + encodeURIComponent(returnUrl));
    }
    return;
  }

  var template = getTemplateForStatus(status);
  var message = res.locals.errorMessage || "An unknown error occurred";
  var extraTemplateValues = {
    title: message
  };

  if(status === 402) {
    /* HTTP 402 = Payment required */
    template = status.toString();

    var room = err.uri;
    var org = room.split('/')[0];

    _.extend(extraTemplateValues, {
      room: room,
      org: org,
      billingUrl: config.get('web:billingBaseUrl')  + '/bill/' + err.uri,
    });
  }

  res.format({
    html: function() {
      res.render(template , _.extend({
         status: status,
         homeUrl : config.get('web:homeurl'),
         user: req.user,
         userMissingPrivateRepoScope: req.user && !userScopes.hasGitHubScope(req.user, 'repo'),
         message: message,
         // Only generate the stack-frames when we need to
         stack: config.get('express:showStack') && err && err.stack && linkStack(err.stack)
       }, extraTemplateValues));
    },
    json: function() {
      res.send({ error: message });
    },
    text: function() {
      res.send('Error: ', message);
    }
  });

};
