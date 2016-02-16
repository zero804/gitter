'use strict';

var Marionette   = require('backbone.marionette');
var Backbone     = require('backbone');
var itemTemplate = require('./profile-menu-item-view.hbs');
var RAF          = require('utils/raf');

var profileCollection = new Backbone.Collection([
  { name: 'Home', stub: '/home' },
  { name: 'Billing', stub: 'http://billing.gitter.im/accounts'},
  { name: 'Get Gitter Apps', stub: '/apps'},
  //TODO Logout does not work JP 27/1/16
  { name: 'Sign Out', stub: '/logout' }
]);

var ItemView = Marionette.ItemView.extend({
  tagName: 'li',
  className: 'lm-profile-menu__item',
  template: itemTemplate
});

module.exports = Marionette.CollectionView.extend({

  tagName: 'ul',
  className: 'lm-profile-menu',
  childView: ItemView,

  constructor: function (){
    this.collection = profileCollection;
    Marionette.CollectionView.prototype.constructor.apply(this, arguments);
  },

  events: {
    'mouseleave': 'onMouseLeave'
  },

  modelEvents: {
    'change:profileMenuOpenState': 'onOpenStateChange',
  },

  onOpenStateChange: function(model, val) {/*jshint unused:true */
    RAF(function(){
      this.$el.toggleClass('active', !!val);
    }.bind(this));
  },

  onMouseLeave: function (){
    this.model.set('profileMenuOpenState', false);
  },

});
