'use strict';

var Marionette = require('backbone.marionette');

module.exports = Marionette.ItemView.extend({

  modelEvents: {
    'change:profileMenuOpenState': 'onOpenStateChange',
  },

  onOpenStateChange: function(model, val) {/*jshint unused:true */
    if (this.model.get('state') !== 'all') return;
    this.$el.toggleClass('active', !!val);
  },
});
