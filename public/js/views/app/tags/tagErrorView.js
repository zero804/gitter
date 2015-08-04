/* jshint node: true */
"use strict";

var Backbone = require('backbone');
var Marionette = require('backbone.marionette');
var tagErrorTemplate = require('./tmpl/tagErrorTemplate.hbs');

var TagErrorView = Marionette.ItemView.extend({

  template: tagErrorTemplate,

  initialize: function(){
    this.listenTo(this.model, 'change', this.render);
  },

  showError: function(msg){
    this.model.set({ message: msg, class: 'error' });
    this.show();
  },

  showMessage: function(msg){
    this.model.set({ message: msg, class: 'message' });
    this.show();
  },

  show: function(){
    this.$el.show();
  },

  hide: function(){
    this.$el.hide();
  }

});

module.exports = TagErrorView;
