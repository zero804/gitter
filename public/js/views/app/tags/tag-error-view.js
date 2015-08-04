/* jshint node: true */
"use strict";

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var tagErrorTemplate = require('./tmpl/tag-tag-error-template.hbs');

var TagErrorView = Marionette.ItemView.extend({

  template: tagErrorTemplate,

  model: new Backbone.Model({tag: ''}),

  initialize: function(){
    this.hide();
    this.listenTo(this.collection, 'tag:error:duplicate', this.show);
    this.listenTo(this.collection, 'tag:added', this.hide);
    this.listenTo(this.model, 'change', this.render);
  },

  hide: function(){
    this.$el.hide();
  },

  show: function(tag){
    this.model.set({'tag': tag });
    this.$el.show();
  }

});

module.exports = TagErrorView;
