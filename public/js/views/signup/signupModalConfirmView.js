/*jshint unused:true, browser:true */

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/signupModalConfirmView'
], function($, _, TroupeViews, template) {
  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      if(!options) options = {};
      this.data = options.data;
      _.bindAll(this, 'onResendLinkClicked');
    },

    events: {
      "click .button-resend": "onResendLinkClicked"
    },

    getRenderData: function() {
      return this.data;
    },

    onResendLinkClicked: function(e) {
      if(e) e.preventDefault();
      var self = this;
       $.ajax({
        url: "/resendconfirmation",
        dataType: "json",
        data: {
          email: this.data.email
        },
        type: "POST",
        success: function(data) {
          self.$el.find(".label-resendsuccess").show();
          self.$el.find(".label-signupsuccess").hide();
        }
      });

    }
  });

});
