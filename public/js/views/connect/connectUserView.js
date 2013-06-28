/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

// TODO: Better transition to request confirm page
define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'hbs!./tmpl/connectUserTemplate',
  'log!connect-user-modal-view',
  'utils/validate-wrapper',
  'jquery-placeholder' // No reference
], function($, _, context, TroupeViews, template, log, validation) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      if(options) {
        this.authenticated = options.authenticated;
      }

      _.bindAll(this, 'onFormSubmit');
    },

    getRenderData: function() {
      var c = context();
      var troupe = context.getTroupe();
      var homeUser = context.getHomeUser();
      console.log("HomeUser: " + homeUser.displayName);
      var firstName = homeUser.displayName.split(" ").shift();
      return {
        homeUser: homeUser,
        firstName: firstName,
        email: this.initialEmail,
        homeUrl: c.homeUrl,
        troupeUri: troupe.uri,
        authenticated: this.authenticated,
        isOneToOne: troupe && troupe.oneToOne
      };
    },

    afterRender: function() {

    },

    events: {
      "submit form": "onFormSubmit",
      "click #cancel-button" : "goBack",
      "click #sigin-button" : "showLoginForm",
      "click #create-account-button" : "createAccountClicked"
    },

    goBack : function () {
      // this is probably not correct should be close modal
      window.location.href = context().homeUrl;
    },

    showLoginForm: function() {
      this.trigger('request.login');
    },

    onFormSubmit: function() {
      var form = this.$el.find('form');
      var postUri =  this.authenticated ? "/api/v1/requestaccessexisting" : "/api/v1/requestaccess";
      var that = this;
      $.ajax({
        url: postUri,
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: form.serialize(),
        type: "POST",
        global: false,
        success: function(data) {
          if(data.success) {
            that.trigger('confirm.connect', {});
            return;
          }
        },
        error: function() {
          $('#request-failed').show();
        }
      });

      return false;
    }
  });

});
