"use strict"

var Backbone = require('backbone');

var TagModel = Backbone.Model.extend({
  defaults: {
    value: ''
  }
});

var TagCollection = Backbone.Collection.extend({
  model: TagModel
});

module.exports = TagCollection;
