/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'utils/appevents',
  'underscore',
  'keymaster'
], function(appEvents, _, key) {
  "use strict";

  // Attach keyboard events listeners as specified by the keymaster library
  // They will we emitted to appEvents with the `keyboard.` prefix
  // Use views/keyboard-events-mixin to attach handlers for these events to Backbone components

  // Define different scopes for the key listeners
  // - 'input-chat' for the chat message input
  // - 'input-search' for the search input
  // - 'input-other' for other inputs (including textarea and select)
  // - 'non-input' for the rest
  key.filter = function(event) {
    var scope, tag = event.target || event.srcElement;
    if (tag.id === 'chat-input-textarea') {
      scope = 'input-chat';
    }
    else if (tag.id === 'list-search-input') {
      scope = 'input-search';
    }
    else if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag.tagName)) {
      scope = 'input-other';
    }
    else {
      scope = 'non-input';
    }
    key.setScope(scope);
    return true;
  };

  // Key mappings
  // Basic usage: 'key': 'event name', scope is 'all' by default
  // Set to a scope: 'key': {name, scope}, scope can be an Array
  // Multiple names/scopes: 'key': ['event name', {name, scope}, ...]
  var keyEvents = {
    'backspace': {
      name: 'backspace',
      scope: 'non-input'
    },
    'esc': [{
      name: 'escape',
      scope: 'all'
    }, {
      name: 'chatEscape',
      scope: 'input-chat'
    }, {
      name: 'searchEscape',
      scope: 'input-search'
    }],
    'enter': {
      name: 'searchGo',
      scope: 'input-search'
    },
    'up': [{
      name: 'arrowUp',
      scope: 'all'
    }, {
      name: 'chatEditLast',
      scope: 'input-chat'
    }, {
      name: 'searchPrev',
      scope: 'input-search'
    }],
    'down': [{
      name: 'arrowDown',
      scope: 'all'
    }, {
      name: 'searchNext',
      scope: 'input-search'
    }],
    'left': {
      name: 'arrowLeft',
      scope: 'non-input'
    },
    'right': [{
      name: 'arrowRight',
      scope: 'non-input'
    }, {
      name: 'searchGo',
      scope: 'input-search'
    }],
    'pageup': 'pageUp',
    'pagedown': 'pageDown',
    'ctrl+space': 'search',
    'ctrl+`': 'toggle',
    'ctrl+h': [{
      name: 'help',
      scope: 'non-input'
      },{
      name: 'chatHelp',
      scope: 'input-chat'
    }],
    'enter, ⌘+enter, ctrl+enter': {
      name: 'chatSend',
      scope: 'input-chat'
    },
    'q, r': {
      name: 'quote',
      scope: 'non-input'
    }
  };

  var assign = function(k, name, scope) {
    if (_.isObject(name)) {
      scope = name.scope;
      name = name.name;
    }
    scope = scope || 'all';

    var _assign = function(s) {
      key(k, s, function(event, handler) {
        appEvents.trigger('keyboard.' + name, event, handler);
        appEvents.trigger('keyboard.all', name, event, handler);
      });
    };

    if (_.isArray(scope)) { // multiple scopes
      _.each(scope, _assign);
    }
    else {
      _assign(scope);
    }
  };

  _.each(keyEvents, function(name, k) {
    if (_.isArray(name)) { // multiple mappings
      _.each(name, function(n) {
        assign(k, n);
      });
    }
    else {
      assign(k, name);
    }
  });

});
