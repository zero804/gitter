"use strict"

var Backbone = require('backbone');

module.exports = Backbone.Collection.extend({
  getCategories(){
    return this.models.map(model => model.toJSON());
  }
});
