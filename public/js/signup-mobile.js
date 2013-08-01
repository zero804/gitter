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
        'login': 'showLogin',
        '*path':  'defaultRoute'
      },

      showSignup: function() {
        $('.form').hide();
        $('#signup-form').show();
        $('#panelList').addClass('showingSecondPanel');
      },

      showLogin: function() {
        $('.form').hide();
        $('#login-form').show();
        $('#panelList').addClass('showingSecondPanel');
      },

      defaultRoute: function() {
        $('#panelList').removeClass('showingSecondPanel');
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
    signupView.once('signup.complete', function(data) {
      signupView.remove();
      new SignupModalConfirmView({
        el: $('#signup-confirmation'),
        data: data
      }).render();
    });

      var view = new LoginModalView({
        el: $('#login-form'),
        fromSignup: true
      });
      view.once('login.complete', function(data) {
        window.location.href= data.redirectTo;
      });


    signupView.render();
    view.render();


    Backbone.history.start();

});
