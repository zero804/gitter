"use strict";

var context = require('utils/context');
var ChatLayout = require('./chat');
var HeaderView = require('views/app/headerView');
var RightToolbarView = require('views/righttoolbar/rightToolbarView');
require('views/behaviors/isomorphic');

module.exports = ChatLayout.extend({

  behaviors: {
    Isomorphic: {
      chat: {
        el: '#content-wrapper',
        init: 'initChatRegion' // Declared in super
      },
      toolbar: {
        el: "#right-toolbar-layout",
        init: 'initToolbarRegion'
      },
      header: {
        el: '#header-wrapper',
        init: 'initHeaderRegion'
      }
    }
  },

  initToolbarRegion: function(optionsForRegion) {
    return new RightToolbarView(optionsForRegion());
  },

  initHeaderRegion: function(optionsForRegion) {
    return new HeaderView(optionsForRegion({ model: context.troupe() }));
  }
});
