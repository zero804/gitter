'use strict';

var Backbone            = require('backbone');
var backboneUrlResolver = require('backbone-url-resolver');

module.exports = Backbone.Collection.extend({
  initialize: function(models, attrs) {//jshint unused: true

    if (!attrs || !attrs.model) {
      throw new Error('A valid model must be passed to SuggestedOrgCollection when initialized');
    }

    this.model = attrs.model;
    this.urlModel = backboneUrlResolver('/api/v1/orgs/:selectedOrgName/suggestedRooms', this.model);
    this.listenTo(this.model, 'change:selectedOrgName', this.onOrgNameUpdate, this);
  },

  url: function() {
    return this.urlModel.get('url');
  },

  onOrgNameUpdate: function(model, val) {//jshint unused: true
    if (!val || val  === '') return;
    this.fetch();
  },
});
