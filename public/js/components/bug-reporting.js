/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'require',
  'utils/context',
  'utils/appevents'
], function(require, context, appEvents) {
  "use strict";

  var ravenUrl = context.env('ravenUrl');

  function normalise(s) {
    return s.replace(/\/_s\/\w+\//, '/_s/l/');
  }

  if(ravenUrl) {
    require(['raven'], function(Raven) {
      Raven.config(ravenUrl, {
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
            }

            return data;
          }
      }).install();

      var user = context.user();
      Raven.setUser({
        username: user && user.get('username')
      });

      appEvents.on('bugreport', function(description, data) {
        if(description instanceof Error) {
          appEvents.trigger('stats.event', 'error');
          Raven.captureException(description, data);
        } else {
          appEvents.trigger('stats.event', 'warning');
          Raven.captureMessage(description, data);
        }
      });

    });

  } else {

    /* No raven here please */
    appEvents.on('bugreport', function(description) {
      if(description instanceof Error) {
        appEvents.trigger('stats.event', 'error');
      } else {
        appEvents.trigger('stats.event', 'warning');
      }
    });

  }



});