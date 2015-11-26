'use strict';

var Marionette = require('backbone.marionette');
var Hammer     = require('hammerjs');

module.exports = Marionette.ItemView.extend({

  modelEvents: {
    'change:panelOpenState': 'onPanelOpenStateChange',
  },

  initialize: function() {
    this.onSwipeLeft = this.onSwipeLeft.bind(this);
    this.hammertime = new Hammer(this.el);
    this.hammertime.on('swipeleft', this.onSwipeLeft);
  },

  onPanelOpenStateChange: function(model, val) { /*jshint unused: true */
    this.$el.toggleClass('active', val);

    //TODO remove this
    if(!!val) this.$el.click();
  },

  onSwipeLeft: function() {
    this.model.set('panelOpenState', false);
  },

  destroy: function (){
    this.hammertime.destroy();
    Marionette.ItemView.prototype.destroy.apply(this, arguments);
  },

});
