'use strict';

var Backbone = require('backbone');
var BaseResolverCollection = require('./base-resolver-collection.js');

var Model = Backbone.Model.extend({
  defaults: {
    isSuggestion: true
  }
});

module.exports = BaseResolverCollection.extend({
  model: Model,
  template: '/v1/user/:id/suggestedRooms',
  initialize: function() {
    BaseResolverCollection.prototype.initialize.apply(this, arguments);
    //Force a reset event so collection views get a re-render
    this.fetch().then(function(){ this.trigger('reset') }.bind(this));
  },
});
