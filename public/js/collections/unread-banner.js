"use strict";
var Backbone = require('backbone');

var model = new Backbone.Model({
  defaults: {
    unreadAbove: 0,
    unreadBelow: 0
  }
});

module.exports = model;
