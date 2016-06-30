'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var itemTemplate = require('./profile-menu-item-view.hbs');
var fastdom = require('fastdom');
var toggleClass = require('utils/toggle-class');
var logout = require('utils/logout');
var isMobile = require('utils/is-mobile');
var isNative = require('utils/is-native');

var profileCollection = new Backbone.Collection([
  { name: 'Home', stub: '/home' },
  { name: 'Billing', stub: 'http://billing.gitter.im/accounts'},
]);

var isWebApp = !isNative();
var isMobileApp = isMobile();

if(isWebApp && !isMobileApp) {
  profileCollection.add({ name: 'Get Gitter Apps', stub: '/apps'});
}

if(isWebApp) {
  profileCollection.add({ name: 'Sign Out', stub: '/logout' });
}

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
    'click': 'onItemClicked',
    'mouseleave': 'onMouseLeave'
  },

  modelEvents: {
    'change:profileMenuOpenState': 'onOpenStateChange',
  },

  onOpenStateChange: function(model, val) {/*jshint unused:true */
    fastdom.mutate(function(){
      toggleClass(this.el, 'active', val);
    }.bind(this));
  },

  onMouseLeave: function (){
    this.model.set('profileMenuOpenState', false);
  },

  onItemClicked: function(e){
    if(e.target.href && /\/logout$/.test(e.target.href)) {
      e.preventDefault();
      logout();
    }
  }

});
