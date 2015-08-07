/* jshint node: true */

"use strict";

var Backbone = require('backbone');

var TagModel = Backbone.Model.extend({
  defaults: {
    value: ''
  },

  //we get an array of tag strings from the server
  //rather than { value: ''  }
  //we need to parse them here
  initialize: function(tag){
    this.set('value', tag);
  },

  validate: function(attrs){
    var tagLength = !!attrs.value && attrs.value.length;
    if(!tagLength || tagLength <= 0 || tagLength > 20){
      //if we have an invalid tag the we want to reset the model
      //the next valid input event will override it
      this.set('value', '', { silent: true });
      return 'Tags must be of a valid tagLength';
    }
  }

});

var TagCollection = Backbone.Collection.extend({

  model: TagModel,

  addModel: function(model) {
    var val = model.get('value');
    //if there is a duplicate fire error
    if(!!this.where({value: val}).length){
      this.trigger('tag:error:duplicate', val);
    }
    else {
      this.add(model);
      this.trigger('tag:added', val);
    }
  },

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
