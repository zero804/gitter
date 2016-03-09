'use strict';

var Backbone = require('backbone');
var context = require('utils/context');

var maxTagLength = 20;
var TagModel = Backbone.Model.extend({
  defaults: {
    value: '',
  },

  //we get an array of tag strings from the server
  //rather than { value: ''  }
  //we need to parse them here
  initialize: function(tag) {
    this.set('value', tag);
  },

  validate: function(attrs) {
    var reservedTagTestRegex = (/:/);
    var messageList = [];
    var isStaff = context.isStaff();

    if (!isStaff && reservedTagTestRegex.test(attrs.value)) {
      messageList.push('Tags can not use `:` colons.');
    }
    var tagLength = !!attrs.value && attrs.value.length;
    if (!tagLength || tagLength <= 0 || tagLength > maxTagLength) {
      messageList.push('Tags must be between 1 and ' + maxTagLength + ' characters in length.');
    }

    if(messageList.length > 0) {
      return messageList.join(' ');
    }
  },

});

var TagCollection = Backbone.Collection.extend({

  model: TagModel,

  addModel: function(model) {
    var val = model.get('value');

    //if there is a duplicate fire error
    if (!!this.where({value: val}).length) {
      this.trigger('tag:error:duplicate', val);
    } else {
      this.add(model);
      this.trigger('tag:added', val);
    }
  },

  toJSON: function() {
    return this.reduce(function(memo, model) {
      memo.push(model.get('value'));
      return memo;
    }, []).join(',');
  },
});

module.exports = {
  TagCollection: TagCollection,
  TagModel: TagModel,
};
