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
      "click #unauthenticated-continue" : "onUnauthenticatedContinue"
    },

    goBack : function () {
      // this is probably not correct should be close modal
      window.location.href = context().homeUrl;
    },

    showLoginForm: function() {
      this.trigger('request.login');
    },

    onUnauthenticatedContinue: function() {
      var form = this.$el.find('form');
      var that = this;
      log("Ok, going to send through to /signup with: " + $("#email").val());
      $.ajax({
        url: "/signup",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify({
          email: $("#email").val()
        }),
        type: "POST",
        success: function(data) {
          // data = { email, success, userStatus, username }
          if (data.redirectTo) {
            window.location.href = "/" + data.redirectTo;
          }
          else if (data.userStatus === 'ACTIVE') {
            // forward to a login prompt
            that.trigger('request.login', { email: data.email });
          }
          else {
             that.trigger('signup.complete', { email: data.email});
           }
        }
      });
    },


    onFormSubmit: function() {
      var form = this.$el.find('form');
      var postUri =  this.authenticated ? "/api/v1/requestaccessexisting" : "/api/v1/requestaccess";
      var that = this;
      $.ajax({
        url: postUri,
        contentType: "application/x-www-form-urlencoded",
        dataType: "json",
        data: { appUri : context.getHomeUser().username},
        type: "POST",
        global: false,
        success: function(data) {
          if(data.success) {
            $('.modal-content').hide();
            $('.modal-success').show();
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
