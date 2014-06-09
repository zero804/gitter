/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'underscore',
  'utils/appevents',
  'log!focus-events'
], function($, _, appEvents, log) {
  "use strict";

  // Central logic for focus events
  // Listens to specific keyboard events to trigger corresponding 'focus.request' events

  var $previous;
  var isEditing = false;
  var $chatFrame = $('#content-frame');
  var frame = $chatFrame.hasClass('trpChatContainer') && 'chat' || 'app';

  // Listen to chat.edit toggle to handle proper focus between inputs

  appEvents.on('chat.edit.show', function() {
    isEditing = true;
  });
  appEvents.on('chat.edit.hide', function() {
    isEditing = false;
  });

  var getTabOrder = function() {
    var order = ['chat', 'search'];
    if (isEditing) order.push('chat.edit');
    return order;
  };

  var findNewFocus = function(fromScope, position) {
    var order = getTabOrder();
    var name = fromScope.replace('input.', '');
    var index = order.indexOf(name);
    var findIndex = index + position;

    if (index === -1 || !order[ findIndex ]) { // not found
      if (position === -1) return order[ order.length-1 ];
      return order[0];
    }
    return order[findIndex];
  };

  var focusNext = function(event, handler) {
    appEvents.trigger('focus.request.' + findNewFocus(handler.scope, 1));
  };

  var focusPrev = function(event, handler) {
    appEvents.trigger('focus.request.' + findNewFocus(handler.scope, -1));
  };

  // Manage 'escape' events on elements to 'blur' them
  // 'focus' back when another 'escape' event is triggered

  var focusOut = function(event) {
    if (event.origin && event.origin !== frame) {
      console.log('request focusOut has origin', event.origin);
      return; //appEvents.trigger('focus.request.' + event.origin + '.out');
    }

    console.log('request focusOut', event, frame);
    $previous = $(document.activeElement);
    $previous.blur();
    console.log('focusOut', $previous);
    appEvents.trigger('focus.change.out', $previous);
  };

  var focusIn = function(event) {
    if (event.origin && event.origin !== frame) {
      console.log('request focusOut has origin', event.origin);
      return appEvents.trigger('focus.request.' + event.origin + '.in');
    }
    console.log('focusIn', $previous);
    if ($previous) {
      $previous.focus();
      appEvents.trigger('focus.change.in', $previous);
      $previous = null;
    }
    else {
      log.warn('Could not respond to focus.request.in: no previous element set. Defaulting to focus.request.chat');
      appEvents.trigger('focus.request.chat');
    }
  };

  // Mapping from appEvents to specific callbacks
  // or shortcuts for 'focus.request' triggers

  var mappings = {
    'keyboard.maininput.tab.next': focusNext,
    'keyboard.maininput.tab.prev': focusPrev,
    'focus.request.out keyboard.maininput.escape keyboard.input.escape': focusOut,
    'focus.request.in keyboard.document.escape': focusIn
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
