"use strict";

var Backbone = require('backbone');
var data = require('./data/topics');

var CategoryStore = Backbone.Collection.extend({
  getTopics: function(){
    return this.models.map(function(model){ return model.toJSON(); });
  },
  getById: function(id){
    return this.get(id).toJSON();
  }
});

var store = new CategoryStore(data);

afterEach(function(){
  store.reset(data);
});

module.exports = store;
