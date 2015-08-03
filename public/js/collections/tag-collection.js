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
  model: TagModel,
  toJSON: function(){
    return this.reduce(function(memo, model){
      memo.push(model.get('value'));
      return memo;
    }, []).join(',');
  }
});

module.exports = {
  TagCollection: TagCollection,
  TagModel: TagModel
};
