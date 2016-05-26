'use strict';

var Backbone = require('backbone');
var backboneUrlResolver = require('backbone-url-resolver');
var SyncMixin = require('./sync-mixin');

module.exports = Backbone.Collection.extend({

  initialize: function (models, attrs){//jshint unused: true
    if(!this.contextModel && (!attrs || !attrs.contextModel)) {
      throw new Error('A valid context model must be passed to a new instance of BaseResolverCollection');
    }

    this.contextModel = (this.contextModel || attrs.contextModel);
    this.template = (this.template || attrs.template);
    this.urlModel = backboneUrlResolver(this.template, this.contextModel);
  },

  url: function() {
    return this.urlModel.get('url');
  },

  sync: SyncMixin.sync,

});
