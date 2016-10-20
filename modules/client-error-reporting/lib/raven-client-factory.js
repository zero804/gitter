"use strict";

var clientEnv = require('gitter-client-env');
var Raven = require('raven-js');

function normalise(s) {
  return s.replace(/\/_s\/\w+\//, '/_s/l/');
}

function ravenClientFactory(options) {
  var ravenUrl = clientEnv.ravenUrl;

  if (!ravenUrl) {
    // No raven in this environment
    return function() {};
  }

  Raven.config(ravenUrl, {
    release: clientEnv['version'],
    // # we highly recommend restricting exceptions to a domain in order to filter out clutter
    // whitelistUrls: ['example.com/scripts/']
    dataCallback: function(data) {
      try {
        data.stacktrace.frames.forEach(function(frame) {
          if(frame.filename) {
            frame.filename = normalise(frame.filename);
          }
        });

        if(data.culprit) {
          data.culprit = normalise(data.culprit);
        }
      } catch(e) {
        /* */
      }


      return data;
    }
  }).install();

  Raven.setUserContext({
    username: options.username
  });

  return function(err, extraData) {
    return Raven.captureException(err, extraData);
  }
}

module.exports = ravenClientFactory;
