/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'underscore',
  'utils/appevents'
], function($, _, appEvents) {
  "use strict";

  var $previous;

  var focusOut = function(event) {
    $previous = $(event.target || event.srcElement);
    $previous.blur();
    appEvents.trigger('focus.change.out', $previous);
  };

  var focusIn = function() {
    if ($previous) {
      $previous.focus();
      appEvents.trigger('focus.change.in', $previous);
      $previous = null;
    }
    else {
      console.warn('Could not respond to focus.request.in: no previous element set. Defaulting to focus.request.chat');
      appEvents.trigger('focus.request.chat');
    }
  };

  var mappings = {
    'keyboard.chat.edit.escape keyboard.search.tab.next keyboard.tab.next': 'chat',
    'keyboard.chat.tab.next': 'search',
    'keyboard.chat.escape keyboard.search.escape keyboard.input.escape': focusOut,
    'keyboard.document.escape': focusIn
  };

  var _bind = function(src, dest) {
    appEvents.on(src, function(e) {
      if (!e.origin) e.preventDefault();
      var args = Array.prototype.slice.call(arguments);
      if (_.isFunction(dest)) {
        dest.apply(dest, args);
      }
      else {
        args.unshift('focus.request.' + dest);
        appEvents.trigger.apply(appEvents, args);
      }
    });
  };

  var eventSplitter = /\s+/;

  _.each(mappings, function(dest, src) {
    if (eventSplitter.test(src)) {
      var sources = src.split(eventSplitter);
      _.each(sources, function(s) {
        _bind(s, dest);
      });
    }
    else {
      _bind(src, dest);
    }
  });

});
