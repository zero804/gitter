"use strict";

var ChatLayout = require('./chat');
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
      }
    }
  },

  initToolbarRegion: function(optionsForRegion) {
    return new RightToolbarView(optionsForRegion());
  }
});
