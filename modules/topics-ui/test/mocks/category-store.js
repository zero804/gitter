"use strict";

var Backbone = require('backbone');
var data = require('./data/categories.js');

var CategoryStore = Backbone.Collection.extend({
  getCategories: function(){
    return this.models.map(function(model){ return model.toJSON(); });
  }
});

var store = new CategoryStore(data);

afterEach(function(){
  store.reset(data);
});

module.exports = store;
