'use strict';

var Marionette = require('backbone.marionette');
var Backbone = require('backbone');
var _ = require('underscore');
var template = require('./profile-menu-view.hbs');
var itemTemplate = require('./profile-menu-item-view.hbs');
var toggleClass = require('../../utils/toggle-class');
var logout = require('../../utils/logout');
var isMobile = require('../../utils/is-mobile');
var isNative = require('../../utils/is-native');
var context = require('../../utils/context');

require('gitter-styleguide/css/components/dropdowns.css');

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
  className: 'dropdown__item--positive profile-menu__item',
  template: itemTemplate
});

module.exports = Marionette.CompositeView.extend({

  template: template,
  childView: ItemView,
  childViewContainer: '#profile-menu-items',

  constructor: function() {
    this.collection = getProfileCollection();
    this.model = new Backbone.Model({ active: false });
    Marionette.CollectionView.prototype.constructor.apply(this, arguments);
  },

  ui: {
    menu: '#profile-menu-items'
  },

  events: {
    'click #profile-menu-avatar': 'onAvatarClicked',
    'click a': 'onItemClicked',
    'mouseleave @ui.menu': 'onMouseLeave'
  },

  modelEvents: {
    'change:active': 'onActiveStateChange'
  },

  serializeData: function(){
    var data = this.model.toJSON();
    var user = context.user();
    return _.extend({}, data, {
      avatarUrl: user.get('avatarUrl'),
      username: user.get('username')
    });
  },

  onMouseLeave: function (){
    this.model.set('active', false);
  },

  onItemClicked: function(e) {
    if(e.target.href && /\/logout$/.test(e.target.href)) {
      e.preventDefault();
      logout();
    }
  },

  onAvatarClicked: function(e){
    e.preventDefault();
    this.model.set({ active: true });
  },

  onActiveStateChange: function(){
    var state = this.model.get('active');
    toggleClass(this.ui.menu[0], 'hidden', !state);
  }

});
