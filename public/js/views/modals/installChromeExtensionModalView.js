/*jshint unused:strict, browser:true */

// TODO: Confirmation after invite sent

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/installChromeExtensionModalView',
  'log!install-chrome-extension'
], function($, _, TroupeViews, template, log) {
  "use strict";
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
    },

    // getRenderData: function() {

    // },

    events: {
      "click #button-install": "installClicked",
      "click #button-cancel" : "cancelClicked"
    },

    installClicked: function() {
      that = this;
      log("Now install");
      chrome.webstore.install(undefined, function() {
        that.$el.find('#installer-frame').attr('src', '/install-chrome-extension');
        that.trigger('install.complete');
      }, function(message) { alert("Failed!" + message);});
    },

    cancelClicked: function() {
      this.trigger('install.cancel');
    },

    afterRender: function(e) {

    }

  });

});
