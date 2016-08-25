'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var itemTemplate = require('./profile-menu-item-view.hbs');
var fastdom = require('fastdom');
var toggleClass = require('../../../../utils/toggle-class');
var logout = require('../../../../utils/logout');
var isMobile = require('../../../../utils/is-mobile');
var isNative = require('../../../../utils/is-native');
var context = require('../../../../utils/context');

function getProfileCollection() {

  var result = new Backbone.Collection([
    { name: 'Home', stub: '/home' },
    { name: 'Billing', stub: 'http://billing.gitter.im/accounts'},
  ]);

  var isWebApp = !isNative();
  var isMobileApp = isMobile();

  if(isWebApp && !isMobileApp) {
    result.add({ name: 'Get Gitter Apps', stub: '/apps'});
  }

  var user = context.user();

  // This is more fragile than i'd like it to be
  function showHideRepoAccess() {
    var scopes = user.get('scopes');
    var existing = result.find(function(f) { return f.get('upgradeItem') });

    if (!user.id || !scopes || scopes.private_repo) {
      // Hide the scope
      if (!existing) return;
      result.remove(existing);
    } else {
      // Show the scope
      if (existing) return;
      var appsItem = result.find(function(f) { return f.get('stub') === '/apps' });

      result.add({ name: 'Allow Private Repo Access', stub: '#upgraderepoaccess', upgradeItem: true }, {
        at: result.indexOf(appsItem) + 1
      });
    }
  }

  showHideRepoAccess();
  user.on('change:id', showHideRepoAccess);
  user.on('change:scopes', showHideRepoAccess);

  if(isWebApp) {
    result.add({ name: 'Sign Out', stub: '/logout' });
  }

  return result;
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

  constructor: function() {
    this.collection = getProfileCollection();
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

  onItemClicked: function(e) {
    if(e.target.href && /\/logout$/.test(e.target.href)) {
      e.preventDefault();
      logout();
    }
  }

});
