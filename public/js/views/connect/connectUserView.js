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
      var displayName = homeUser.displayName || '';
      var firstName = displayName.split(" ").shift();
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
      var that = this;
      setTimeout(function(){
        that.$el.find('#existing-user').slideDown();
      },750);

    },

    events: {
      "submit form": "onFormSubmit",
      "click #cancel-button" : "goBack",
      "click #sigin-button" : "showLoginForm",
      "click #unauthenticated-continue" : "onUnauthenticatedContinue",
      "click #existing-user" : "showLoginForm",
    },

    goBack : function () {
      // this is probably not correct should be close modal
      window.location.href = context().homeUrl;
    },

    showLoginForm: function() {
      this.trigger('request.login', { email: this.$el.find("#email").val() });
    },

    onUnauthenticatedContinue: function() {
      var that = this;
      log("Ok, going to send through to /requestaccess with: " + $("#email").val());
      $.ajax({
        url: "/api/v1/requestaccess",
        dataType: "json",
        data: {
          email: this.$el.find("#email").val(),
          name: this.$el.find("#displayName").val(),
          appUri : context.getHomeUser().username
        },
        statusCode: {
          400: function(data) {
            log("Got 400. Data lookslike: " + data.userExists);
            if ($.parseJSON(data.responseText).userExists) {
              log("Triggering login yo");
              that.trigger('request.login', { email: that.$el.find("#email").val() });
            }
          }
        },
        type: "POST",
        success: function(data) {
          // store the details of this invite in local storage to show success after confirmation
          try {
            if (window.localStorage) {
              var rd = _.extend(that.getRenderData(), { time: Date.now() });
              window.localStorage.pendingConnectConfirmation = JSON.stringify(rd);
            }
          }
          catch(e) {}

          // data = { email, success, userStatus, username }
          if (data.redirectTo) {
            window.location.href = "/" + data.redirectTo;
          }
          else {
             that.trigger('signup.complete', { email: $("#email").val()});
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
