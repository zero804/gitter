// Filename: views/home/main
// TODO: Confirmation after invite sent

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./installChromeExtensionModalView'
], function($, _, TroupeViews, template) {

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
      console.log("Now install");
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