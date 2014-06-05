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
  // - 'input.chat' for the chat message input
  // - 'input.chat.edit' for the chat message edit input
  // - 'input.search' for the search input
  // - 'input.other' for other inputs (including textarea and select)
  // - 'other' for the rest
  key.filter = function(event) {
    var scope, tag = event.target || event.srcElement;
    if (tag.id === 'chat-input-textarea') {
      scope = 'input.chat';
    }
    else if (tag.id === 'list-search-input') {
      scope = 'input.search';
    }
    else if (tag.className === 'trpChatInput') {
      scope = 'input.chat.edit';
    }
    else if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag.tagName)) {
      scope = 'input.other';
    }
    else {
      scope = 'other';
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
      scope: 'other'
    },
    'esc': [{
      name: 'escape',
      scope: 'all'
      },{
      name: 'chat.escape',
      scope: 'input.chat'
      },{
      name: 'chat.edit.escape',
      scope: 'input.chat.edit'
      },{
      name: 'search.escape',
      scope: 'input.search'
    }],
    'enter': {
      name: 'search.go',
      scope: 'input.search'
    },
    'enter, ⌘+enter, ctrl+enter': [{
      name: 'chat.send',
      scope: 'input.chat'
      },{
      name: 'chat.edit.send',
      scope: 'input.chat.edit'
    }],
    'up': [{
      name: 'arrowUp',
      scope: 'all'
      },{
      name: 'chat.edit.openLast',
      scope: 'input.chat'
      },{
      name: 'search.prev',
      scope: 'input.search'
    }],
    'down': [{
      name: 'arrowDown',
      scope: 'all'
      },{
      name: 'search.next',
      scope: 'input.search'
    }],
    'left': {
      name: 'arrowLeft',
      scope: 'other'
    },
    'right': [{
      name: 'arrowRight',
      scope: 'other'
      },{
      name: 'search.go',
      scope: 'input.search'
    }],
    'pageup': 'pageUp',
    'pagedown': 'pageDown',
    'ctrl+space': 'search.open',
    'ctrl+`': 'toggle',
    'ctrl+h': [{
      name: 'help',
      scope: 'other'
      },{
      name: 'chat.help',
      scope: 'input.chat'
    }],
    'q, r': {
      name: 'quote',
      scope: 'other'
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
