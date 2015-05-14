"use strict";

var _ = require('underscore');
var ChatLayout = require('./chat');
var RightToolbarView = require('views/righttoolbar/rightToolbarView');

module.exports = ChatLayout.extend({
  regions: _.extend({}, ChatLayout.prototype.regions, {
    toolbar: "#right-toolbar-layout",
  }),

  initToolbarRegion: function(optionsForRegion) {
    return new RightToolbarView(optionsForRegion('toolbar'));
  }
});
