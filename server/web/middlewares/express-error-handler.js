/*jshint globalstrict: true, trailing: false, unused: true, node: true */
"use strict";

var env = require('gitter-web-env');
var config         = env.config;
var logger         = env.logger;
var errorReporter  = env.errorReporter;
var statsClient    = env.createStatsClient({ prefix: config.get('stats:statsd:prefix') });
var _              = require('underscore');

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

function stat(name, req, additionalTags) {
  var user = req.user;
  var username = user && user.username;
  var tags = additionalTags || [];

  if (username) {
    tags.push('user:' + username);
}

  if (req.path) {
    tags.push('path:' + req.path);
  }

  statsClient.increment(name, 1, 1, tags);
}


/* Has to have four args */
module.exports = function(err, req, res, next) { // jshint unused:false
  var user = req.user;
  var userId = user && user.id;

  var status = 500;
  var template = '500';
  var message = "An unknown error occurred";
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
    stat('client_error_5xx', req);

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
      logger.error('Error: ' + err.stack);
    }

  } else if(status === 404) {
    stat('client_error_404', req);

    extraTemplateValues = {
      title: 'Page Not Found'
    };

    template = status.toString();
  } else if(status === 402) {
    /* HTTP 402 = Payment required */
    template = status.toString();

    var room = err.uri;
    var org = room.split('/')[0];

    extraTemplateValues = {
      room: room,
      org: org,
      billingUrl: config.get('web:billingBaseUrl')  + '/bill/' + err.uri,
    };

    stat('client_error_402', req);
  } else if (status === 403) {
    stat('client_error_403', req);

    extraTemplateValues = {
      title: 'Access denied'
    };
  } else if(status === 429) {
    stat('client_error_429', req);
  } else if(status >= 400 && status < 500) {
    stat('client_error_4xx', req, ['status:' + status]);
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
