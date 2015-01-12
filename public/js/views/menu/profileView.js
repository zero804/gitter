"use strict";
var context = require('utils/context');
var Marionette = require('marionette');
var appEvents = require('utils/appevents');
var isMobile = require('utils/is-mobile');
var isNative = require('utils/is-native');
var template = require('./tmpl/profile.hbs');
var apiClient = require('components/apiClient');
var logout = require('utils/logout');

require('views/behaviors/widgets');

module.exports = (function () {

  return Marionette.ItemView.extend({
    template: template,

    events: {
      "click #link-home": 'homeClicked',
      "click #link-logout": 'logoutClicked'
    },

    behaviors: {
      Widgets: {}
    },

    initialize: function (options) {
      this.state = options.state;
      this.listenTo(this.state, 'change', this.render);
      this.render();
    },

    serializeData: function () {
      var user = context.getUser();
      var userModel = context.user();

      var isMobileResult = isMobile();
      var isNativeResult = isNative();

      return {
        menuHeaderExpanded: this.state.get('menuHeaderExpanded'),
        isMobile: isMobileResult,
        displayName: user.displayName || user.username,
        user: userModel,
        billingUrl: context.env('billingUrl'),
        showBilling: !isMobileResult,
        showGetApps: !isMobileResult && !isNativeResult,
        showSignout: !isNativeResult
      };
    },

    homeClicked: function (e) {
      e.preventDefault();
      if (context().user.url !== window.location.pathname) {
        appEvents.trigger('navigation', context.getUser().url, 'home', '');
      }
    },

    logoutClicked: function(e) {
      e.preventDefault();
      logout();
    }
  });

})();

