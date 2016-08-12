"use strict";

var Backbone = require('backbone');
var { dispatch } = require('../dispatcher');

var Model = Backbone.Model.extend({
  defaults: {}
});

module.exports = Backbone.Collection.extend({

  model: Model,

  getTopics() {
    return this.models.map(model => model.toJSON());
  },

  getById(id){
    return this.get(id).toJSON();
  }

});
