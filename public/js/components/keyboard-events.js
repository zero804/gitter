"use strict";
var context = require('utils/context');
var appEvents = require('utils/appevents');
var platformDetect = require('utils/platformDetect');
var platformKeys = require('utils/platform-keys');
var _ = require('underscore');
var key = require('keymaster');

module.exports = (function() {


  // Attach keyboard events listeners as specified by the keymaster library
  // They will we emitted to appEvents with the `keyboard.` prefix
  // Use views/keyboard-events-mixin to attach handlers for these events to Backbone components

  var platform = platformDetect();
  // Set modifier keys for the OS
  var cmdKey = platformKeys.cmd;
  var roomKey = platformKeys.room;
  var room2Key = platformKeys.room2;
  var gitterKey = platformKeys.gitter;

  // Define different scopes for the key listeners
  // - 'input.chat' for the chat message input
  // - 'input.chat.edit' for the chat message edit input
  // - 'input.search' for the search input
  // - 'input.other' for other inputs (including textarea and select)
  // - 'other' for the rest
  key.filter = function (event) {
    var scope, tag = event.target || event.srcElement;

    if (tag.getAttribute('data-prevent-keys') === 'on') {
      return false; // Prevent triggering
    }
    if (tag.id === 'chat-input-textarea') {
      scope = 'input.chat';
    }
    else if (tag.id === 'list-search-input' || tag.classList.contains('js-search-input')) {
      scope = 'input.search';
    }
    else if (/^trpChatInput/.test(tag.className)) {
      scope = 'input.chat.edit';
    }
    else if (/^(INPUT|TEXTAREA|SELECT)$/.test(tag.tagName)) {
      scope = 'input.other';
    }
    else if (tag.classList.contains('js-room-topic-edit-activator')) {
      scope = 'button.room-topic-edit';
    }
    else if (tag.classList.contains('js-profile-menu-toggle')) {
      scope = 'button.profile-menu';
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
      name: 'chat.escape',
      scope: 'input.chat'
      },{
      name: 'chat.edit.escape',
      scope: 'input.chat.edit'
      },{
      name: 'search.escape',
      scope: 'input.search'
      },{
      name: 'maininput.escape',
      scope: ['input.chat', 'input.search']
      },{
      name: 'input.escape',
      scope: 'input.other'
      },{
      name: 'document.escape',
      scope: 'other'
    }],
    'space': [{
      name: 'room-topic.edit',
      scope: 'button.room-topic-edit'
      },{
      name: 'profile-menu.toggle',
      scope: 'button.profile-menu'
      }],
    'enter': [{
      name: 'search.go',
      scope: 'input.search'
    },{
      name: 'chat.compose.auto',
      scope: 'input.chat'
    },{
      name: 'room-topic.edit',
      scope: 'button.room-topic-edit'
    },{
      name: 'profile-menu.toggle',
      scope: 'button.profile-menu'
    }],
    'shift+enter': [{
      name: 'chat.compose.auto',
      scope: 'input.chat'
    }],
    'up': [{
      name: 'room.up',
      scope: 'other'
      },{
      name: 'chat.edit.openLast',
      scope: 'input.chat'
      },{
      name: 'search.prev',
      scope: 'input.search'
      }],
    'down': [{
      name: 'room.down',
      scope: 'other'
      },{
      name: 'search.next',
      scope: 'input.search'
      }],
    'right': [{ name: 'room.next', scope: 'other' }],
    'left': [{ name: 'room.prev', scope: 'other' }],
    'tab': [{
      name: 'maininput.tab.next',
      scope: ['input.chat', 'input.chat.edit', 'input.search']
      }],
    '⇧+tab': [{
      name: 'maininput.tab.prev',
      scope: ['input.chat', 'input.chat.edit', 'input.search']
      }],
    'pageup': 'pageUp',
    'pagedown': 'pageDown',
    'q, r': {
      name: 'quote',
      scope: 'other'
    },
    'shift+/,?': [{
      name: 'help.keyboard',
      scope: 'other'
    }],
  };

  // OS-specific modifier key
  keyEvents['enter, ' + cmdKey + '+enter'] = [{
    name: 'chat.send',
    scope: 'input.chat'
    },{
    name: 'chat.edit.send',
    scope: 'input.chat.edit'
  }];

  keyEvents[cmdKey + '+/, ' + cmdKey + '+' + gitterKey + '+/'] = 'chat.toggle';
  keyEvents[cmdKey + '+' /*+ gitterKey*/ + '+s'] = 'focus.search';
  keyEvents[cmdKey + '+' + gitterKey + '+c'] = 'focus.chat';
  keyEvents[cmdKey + '+' + gitterKey + '+m'] = 'help.markdown';
  keyEvents[cmdKey + '+' + gitterKey + '+k'] = 'help.keyboard';

  var roomModifiers = cmdKey + '+' + roomKey;
  if(platform !== 'Mac' && platform !== 'Windows') {
    roomModifiers = roomKey + '+' + room2Key;
  }

  keyEvents[gitterKey + '+' + roomKey + '+up'] = 'room.up';
  keyEvents[gitterKey + '+' + roomKey + '+down'] = 'room.down';
  keyEvents[gitterKey + '+' + roomKey + '+left'] = 'room.prev';
  keyEvents[gitterKey + '+' + roomKey + '+right'] = 'room.next';
  keyEvents[gitterKey + '+' + roomKey + '+enter'] = 'room.enter';

  // Go to a conversation by index in list
  _.each('123456789'.split(''), function (n) {
    keyEvents[cmdKey + '+' + roomKey + '+' + n] = 'room.' + n;
  });
  keyEvents[cmdKey + '+' + roomKey + '+0'] = 'room.10';

  // Add listeners

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


})();
