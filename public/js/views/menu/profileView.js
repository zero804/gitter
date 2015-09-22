"use strict";
var context = require('utils/context');
var Marionette = require('backbone.marionette');
var appEvents = require('utils/appevents');
var isMobile = require('utils/is-mobile');
var isNative = require('utils/is-native');
var template = require('./tmpl/profile.hbs');
var logout = require('utils/logout');

require('views/behaviors/widgets');

module.exports = (function () {

  return Marionette.ItemView.extend({
    template: template,
    className: function() {
      // expanded by default for mobile
      return isMobile() ? 'menu-header menu-header--expanded' : 'menu-header';
    },
    events: {
      'click': 'toggleExpanded',
      'click #link-home': 'homeClicked',
      'click #link-logout': 'logoutClicked'
    },

    behaviors: {
      Widgets: {}
    },

    modelEvents: {
      'change': 'render'
    },

    serializeData: function () {
      var userModel = context.user().toJSON();
      var isNativeResult = isNative();

      return {
        isMobile: isMobile(),
        user: userModel,
        billingUrl: context.env('billingUrl'),
        showBilling: !isMobile(),
        showGetApps: !isMobile() && !isNativeResult,
        showSignout: !isNativeResult
      };
    },

    onRender: function() {
      if (isMobile()) {
        this.$el.addClass('menu-header--expanded');
      }
    },

    toggleExpanded: function() {
      // stay expanded on mobile
      if (isMobile()) return;

      this.$el.toggleClass('menu-header--expanded');
    },

    homeClicked: function (e) {
      e.preventDefault();
      if (context().user.url !== window.location.pathname) {
        appEvents.trigger('navigation', '/home', 'home', 'home');
      }
    },

    logoutClicked: function(e) {
      e.preventDefault();
      logout();
    }
  });

})();
