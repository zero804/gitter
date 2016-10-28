'use strict';

var Marionette = require('backbone.marionette');
var template = require('./group-back-control-view.hbs');
var toggleClass = require('../../../../utils/toggle-class');

module.exports = Marionette.ItemView.extend({

  template: template,

  modelEvents: {
    'change:state': 'onModelChangeState'
  },

  events: {
    'click': 'onClick'
  },

  initialize: function() {
    this.onModelChangeState();
  },

  onModelChangeState: function(){
    var state = this.model.get('state');
    toggleClass(this.el, 'hidden', state !== 'org');
  },

  onClick: function(e){
    e.preventDefault();
    this.model.set({ state: 'group' });
  }

});
