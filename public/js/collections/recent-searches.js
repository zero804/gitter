'use strict';

var Backbone = require('backbone');

var Model = Backbone.Model.extend({
  defaults: { name: '' }
});

module.exports = Backbone.Collection.extend({
  model: Model,
  add: function(model){
    if(!!this.where(model).length) { return }
    Backbone.Collection.prototype.add.apply(this, arguments);
  }
});
