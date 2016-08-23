"use strict";

var Backbone = require('backbone');
var data = require('./mock-data/new-topic');

var NewTopicStore = Backbone.Model.extend({});

var store = new NewTopicStore(data);

afterEach(function(){
  store.set(data);
});

module.exports = store;
