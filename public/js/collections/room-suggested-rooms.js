'use strict';

var Backbone            = require('backbone');
var backboneUrlResolver = require('backbone-url-resolver');

module.exports = Backbone.Collection.extend({
  initialize: function(models, attrs){//jshint unused: true
    if(!attrs || !attrs.contextModel) {
      throw new Error('A valid context model has to be passed to a new instance of SuggestedRoomsByRoomCollection');
    }

    this.contextModel = attrs.contextModel;
    this.urlModel     = backboneUrlResolver('/v1/rooms/:roomId/suggestedRooms', this.contextModel);
  },

  url: function() {
    return this.urlModel.get('url');
  },

});
