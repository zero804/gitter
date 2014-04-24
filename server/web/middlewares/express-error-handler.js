/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var nconf          = require('../../utils/config');
var winston        = require('../../utils/winston');
var statsService   = require('../../services/stats-service');
var errorReporting = require('../../utils/error-reporting');
var _              = require('underscore');

function linkStack(stack) {
  if(!stack) return;
  return stack.split(/\n/).map(function(i) {
    return i.replace(/\(([^:]+):(\d+):(\d+)\)/, function(match, file, line, col) {
      var ourCode = file.indexOf('node_modules') == -1;
      var h = "(<a href='subl://open/?url=file://" + file + "&line=" + line + "&column=" + col + "'>" + file + ":" + line + ":" + col + "</a>)";
      if(ourCode) h = "<b>" + h + "</b>";
      return h;
    });
  }).join('\n');
}


/* Has to have four args */
module.exports = function(err, req, res, next) {
  var user = req.user;
  var userId = user && user.id;

  var status = 500;
  var template = '500';
  var message = "An unknown error occurred";
  var stack = err && err.stack;

  if(_.isNumber(err)) {
   if(err > 400) {
     status = err;
     message = 'HTTP ' + err;
   }
  } else {
   if(_.isNumber(err.status)) {
     status = err.status;
   }

   if(err.message) {
     message = err.message;
   }
  }

  /* Got a 401, the user isn't logged in and this is a browser? */
  if(status === 401 && req.accepts(['json','html']) === 'html' && !req.user) {
    req.session.returnTo = req.url.replace(/\/~chat$/,"");
    res.redirect('/login');
    return;
  }


  if(status >= 500) {
   // Send to sentry
   errorReporting(err, { type: 'response', status: status, userId: userId, url: req.url, method: req.method });
   // Send to statsd
   statsService.event('client_error_5xx', { userId: userId });

   winston.error("An unexpected error occurred", {
     path: req.path,
     message: message
   });

   if(err.stack) {
     winston.error('Error: ' + err.stack);
   }

  } else if(status === 404) {
   statsService.event('client_error_404', { userId: userId });

   template = '404';
   stack = null;
  } else if(status >= 400 && status < 500) {
   statsService.event('client_error_4xx', { userId: userId });
  }
  res.status(status);

  var responseType = req.accepts(['html', 'json']);

  if (responseType === 'html') {
   res.render(template , {
     status: status,
     homeUrl : nconf.get('web:homeurl'),
     user: req.user,
     userMissingPrivateRepoScope: req.user && !req.user.hasGitHubScope('repo'),
     message: message,
     stack: nconf.get('express:showStack') && stack ? linkStack(stack) : null
   });
  } else if (responseType === 'json') {
   res.send({ error: message });
  } else {
   res.type('txt').send(message);
  }


};