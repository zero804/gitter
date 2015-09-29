"use strict";
var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var context = require('utils/context');
var template = require('./tmpl/chatInputView.hbs');
var ChatInputBoxView = require('./chat-input-box-view');
//var JoinRoomView = require('./join-room-view');
var ChatInputButtons = require('./chat-input-buttons');

require('views/behaviors/isomorphic');

var ChatInputView = Marionette.LayoutView.extend({

  template: template,

  behaviors: {
    Widgets: {},
    Isomorphic: {
      chatInputBox: { el: '#chat-input-box-region', init: 'initChatInputBoxRegion' },
      chatInputButtons: { el: '#chat-input-buttons-region', init: 'initChatInputButtonsRegion' }
    }
  },

  regions: {
    chatInputBox: '#chat-input-box-region',
    chatInputButtons: '#chat-input-buttons-region'
  },

  //modelEvents: {
  //  'change:roomMember': '_roomMemberChanged'
  //},

  initialize: function() {
    // clean up old compose mode persistance in the next event loop.
    // Remove this by 1 December 2015
    setTimeout(function() {
      window.localStorage.removeItem('compose_mode_enabled');
    }, 0);

    this.composeMode = new Backbone.Model({ isComposeModeEnabled: false });
  },

  serializeData: function() {
    return { user: context.user().toJSON() };
  },

  initChatInputBoxRegion: function(optionsForRegion) {
    //if (this.model.get('roomMember')) {
      return new ChatInputBoxView(optionsForRegion({
        composeMode: this.composeMode,
        collection: this.collection
      },  { rerender: true }));
    //} else {
    //  return new JoinRoomView(optionsForRegion({ },  { rerender: true }));
    //}
  },

  //_roomMemberChanged: function() {
  //  if (this.model.get('roomMember')) {
  //    this.chatInputBox.show(new ChatInputBoxView({
  //      composeMode: this.composeMode,
  //      collection: this.collection
  //    }));
  //  } else {
  //    if (!this.model.get('aboutToLeave')) {
  //      this.chatInputBox.show(new JoinRoomView({ }));
  //    }
  //  }
  //},

  initChatInputButtonsRegion: function(optionsForRegion) {
    return new ChatInputButtons(optionsForRegion({
      model: this.composeMode
    }));
  }

});

module.exports = ChatInputView;
