/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery-hammer',
  'backbone',
  'views/signup/signupModalView',
  'views/signup/signupModalConfirmView',
  'views/login/loginModalView'
  ], function($, Backbone, SignupModalView, SignupModalConfirmView, LoginModalView) {
    "use strict";

    var Router = Backbone.Router.extend({
      routes: {
        'signup': 'showSignup',
        'signup/:email/please-confirm': 'showSignupPleaseConfirm',
        'login': 'showLogin',
        '*path':  'defaultRoute'
      },

      showSignup: function() {
        $('.form').hide();
        $('#signup-form').show();
        $('#panelList').removeClass('showingThirdPanel').addClass('showingSecondPanel');
      },

      showSignupPleaseConfirm: function(email) {
        $('.form').hide();
        confirmView.email = email;
        confirmView.render();
        $('#signup-confirmation').show();
        $('#panelList').removeClass('showingSecondPanel').addClass('showingThirdPanel');
      },

      showLogin: function() {
        $('.form').hide();
        $('#login-form').show();
        $('#panelList').removeClass('showingThirdPanel').addClass('showingSecondPanel');
      },

      defaultRoute: function() {
        $('#panelList').removeClass('showingSecondPanel showingThirdPanel');
      }
    });

    var app = new Router();

    $('#signup-button').hammer().on('tap', function(event) {
      app.navigate('signup', {trigger: true});
      event.stopPropagation();
    });

    $('#login-button').hammer().on('tap', function(event) {
      app.navigate('login', {trigger: true});
      event.stopPropagation();
    });

    var signupView = new SignupModalView({el: $('#signup-form')});
    signupView.on('signup.complete', function(data) {
      app.navigate('signup/'+data.email+'/please-confirm', {trigger: true});
    });

    var confirmView = new SignupModalConfirmView({
      el: $('#signup-confirmation')
    });

    var view = new LoginModalView({
      el: $('#login-form'),
      fromSignup: true,
      noAutofocus: true
    });

    view.once('login.complete', function(data) {
      window.location.href= data.redirectTo;
    });

    signupView.render();
    view.render();

    Backbone.history.start();

});
