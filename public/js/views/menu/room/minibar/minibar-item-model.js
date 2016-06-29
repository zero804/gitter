"use strict";

var Backbone = require('backbone');

var MinibarItemModel = Backbone.Model.extend({
  defaults: {
    name: ' ',
    type: 'org',
    url: ' ',
  }
});

module.exports = MinibarItemModel;
