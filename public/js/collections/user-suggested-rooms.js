'use strict';

var BaseResolverCollection = require('./base-resolver-collection.js');

module.exports = BaseResolverCollection.extend({
  template: '/v1/user/:id/suggestedRooms',
  initialize: function() {
    BaseResolverCollection.prototype.initialize.apply(this, arguments);
    //Force a reset event so collection views get a re-render
    this.fetch().then(function(){ this.trigger('reset') }.bind(this));
  },
});
