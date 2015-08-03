"use strict"

var Backbone = require('backbone');

var TagModel = Backbone.Model.extend({
  defaults: {
    value: ''
  },

  validate: function(attrs){
    //todo add tag maximum value??
    if(attrs.value.length <= 0){
      return 'Tags must be of a valid length';
    }
  }
});

var TagCollection = Backbone.Collection.extend({
  model: TagModel
});

module.exports = {
  TagCollection: TagCollection,
  TagModel: TagModel
};
