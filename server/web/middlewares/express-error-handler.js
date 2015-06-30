/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env = require('gitter-web-env');
var config         = env.config;
var logger         = env.logger;
var stats          = env.stats;
var errorReporter  = env.errorReporter;

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
module.exports = function(err, req, res, next) { // jshint unused:false
  var user = req.user;
  var userId = user && user.id;

  var status = 500;
  var template = '500';
  var message = "An unknown error occurred";
  var stack = err && err.stack;
  var extraTemplateValues;

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
    var returnUrl = req.url.replace(/\/~(\w+)$/,"");

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


  if(status >= 500) {
    // Send to sentry
    errorReporter (err, { type: 'response', status: status, userId: userId, url: req.url, method: req.method });
    // Send to statsd
    stats.event('client_error_5xx', { userId: userId, url: req.url });

    extraTemplateValues = {
      title: 'Error ' + status
    };

    logger.error("An unexpected error occurred", {
       method: req.method,
       url: req.url,
       userId: userId,
       message: message
    });

    if(err.stack) {
      logger .error('Error: ' + err.stack);
    }

  } else if(status === 404) {
    stats.event('client_error_404', { userId: userId });

    extraTemplateValues = {
      title: 'Page Not Found'
    };

    template = status.toString();
    stack = null;
  } else if(status === 402) {
    /* HTTP 402 = Payment required */
    template = status.toString();
    stack = null;

    var room = err.uri;
    var org = room.split('/')[0];

    extraTemplateValues = {
      room: room,
      org: org,
      billingUrl: config.get('web:billingBaseUrl')  + '/bill/' + err.uri,
    };

    stats.event('client_error_402', { userId: userId });
  } else if(status >= 400 && status < 500) {
    stats.event('client_error_4xx', { userId: userId });
  }

  res.status(status);

  res.format({
    html: function() {
      res.render(template , _.extend({
         status: status,
         homeUrl : config.get('web:homeurl'),
         user: req.user,
         userMissingPrivateRepoScope: req.user && !req.user.hasGitHubScope('repo'),
         message: message,
         stack: config.get('express:showStack') && stack ? linkStack(stack) : null
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
