/*jshint strict:true, undef:true, unused:strict, browser:true *//* global require:false */
require([
  'jquery-hammer',
  'backbone',
  'views/signup/signupModalView',
  'views/signup/signupModalConfirmView',
  'views/login/loginModalView'
  ], function($, Backbone, SignupModalView, SignupModalConfirmView, LoginModalView) {
    "use strict";

    var HomepageRouter = Backbone.Router.extend({
      routes: {
        'signup': 'showSignup',
        'signup/:email/please-confirm': 'showSignupPleaseConfirm',
        'login(/:email)': 'showLogin',
        '*path':  'defaultRoute'
      },

      showSignup: function() {
        $('.form').hide();
        $('#signup-form').show();
        $('#panelList').removeClass('showingThirdPanel').addClass('showingSecondPanel');
      },

      showSignupPleaseConfirm: function(email) {
        $('.form').hide();
        confirmView.options.email = email;
        confirmView.render();
        $('#signup-confirmation').show();
        $('#panelList').removeClass('showingSecondPanel').addClass('showingThirdPanel');
      },

      showLogin: function(email) {
        $('.form').hide();
        loginView.initialEmail = email;
        loginView.render();
        $('#login-form').show();
        $('#panelList').removeClass('showingThirdPanel').addClass('showingSecondPanel');
      },

      defaultRoute: function() {
        $('#panelList').removeClass('showingSecondPanel showingThirdPanel');
      }
    });

    var homepage = new HomepageRouter();

    $('#button-signup, #button-existing-users-login').hammer().on('touch', function(event) {
      // stop click events
      event.gesture.preventDefault();
      event.stopPropagation();
    });

    $('#button-signup').on('tap', function() {
      homepage.navigate('signup', {trigger: true});
    });

    $('#button-existing-users-login').on('tap', function() {
      homepage.navigate('login', {trigger: true});
    });

    var signupView = new SignupModalView({el: $('#signup-form')});
    signupView.on('signup.complete', function(data) {
      homepage.navigate('signup/'+data.email+'/please-confirm', {trigger: true});
    });
    signupView.on('login.prompt', function(data) {
      homepage.navigate('login/'+data.email, {trigger: true});
    });

    var confirmView = new SignupModalConfirmView({
      el: $('#signup-confirmation')
    });

    var loginView = new LoginModalView({
      el: $('#login-form'),
      fromSignup: true,
      noAutofocus: true
    });

    loginView.once('login.complete', function(data) {
      window.location.href= data.redirectTo;
    });

    signupView.render();
    loginView.render();

    Backbone.history.start();

});
