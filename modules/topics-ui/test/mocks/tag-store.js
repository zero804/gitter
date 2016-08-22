"use strict";

var Backbone = require('backbone');
var data = require('./data/tags');

var CategoryStore = Backbone.Collection.extend({
  getTags: function(){
    return this.models.map(function(model){ return model.toJSON(); });
  }
});

var store = new CategoryStore(data);

afterEach(function(){
  store.reset(data);
});

module.exports = store;
