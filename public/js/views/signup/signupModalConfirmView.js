/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'backbone',
  'hbs!./tmpl/signupModalConfirmView'
], function($, Backbone, template) {
  "use strict";

  return Backbone.View.extend({

    template: template,

    events: {
      "click .button-resend": "onResendLinkClicked",
      "click .button-close": "onCloseLinkClicked"
    },

    render: function() {
      this.$el.html(this.template({email: this.options.email}));
      return this;
    },

    onCloseLinkClicked: function() {
      $(".close").click();
    },

    onResendLinkClicked: function(e) {
      if(e) e.preventDefault();
      var self = this;
       $.ajax({
        url: "/resendconfirmation",
        dataType: "json",
        data: {
          email: this.options.email
        },
        type: "POST",
        success: function() {
          self.$el.find(".label-resendsuccess").show();
          self.$el.find(".label-signupsuccess").hide();
        }
      });

    }
  });

});
