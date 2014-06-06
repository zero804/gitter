/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery',
  'underscore',
  'utils/appevents'
], function($, _, appEvents) {
  "use strict";

  var $previous;
  var isEditing = false;

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
    console.log('focusNext', handler, findNewFocus(handler.scope, 1));
    appEvents.trigger('focus.request.' + findNewFocus(handler.scope, 1));
  };

  var focusPrev = function(event, handler) {
    console.log('focusPrev', handler, findNewFocus(handler.scope, -1));
    appEvents.trigger('focus.request.' + findNewFocus(handler.scope, -1));
  };

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
    'keyboard.maininput.tab.next': focusNext,
    'keyboard.maininput.tab.prev': focusPrev,
    'keyboard.maininput.escape keyboard.input.escape': focusOut,
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
