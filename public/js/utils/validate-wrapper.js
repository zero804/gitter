/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery-validate'
], function() {
  "use strict";

  $.validator.addMethod(
      "userDisplayName",
      function(value) {
        var re = /^[^<>]+$/;
        return re.test(value);
      },
      "Your name cannot contain special characters."
  );

  $.validator.addMethod(
      "noSpecialChars",
      function(value) {
        var re = /^[^<>]+$/;
        return re.test(value);
      },
      "Field cannot contain special characters."
  );


  return {

    rules: {
      troupeName: function() {
        return { required: true, noSpecialChars: true, minlength: 4 };
      },

      userDisplayName: function() {
        return { required: true, userDisplayName: true, minlength: 2 };
      },

      userEmail: function() {
        return { required: true, email: true };
      },

      password: function(required) {
        var b = { minlength: 6 };
        if(required) b.required = true;
        return b;
      }

    },

    messages: {
      troupeName: function() {
        return {
          minlength: "Please choose a longer name for your Troupe, it needs to be at least 4 letters.",
          noSpecialChars: "Please choose a name for your Troupe. No special characters.",
          required: "Please choose a name for your Troupe. "
        };
      },

      userDisplayName: function() {
        return {
          required: "Please tell us your name.",
          userDisplayName: "Please tell us your name. No special characters.",
          minlength: "Please tell us your name. At least two characters long please"
        };
      },

      userEmail: function() {
        return {
          required: "We need to know your email address",
          email: "Hmmm, that doesn't look like your email address."
        };
      },

      password: function() {
        return {
          minlength: "Password must be at least 6 characters.",
          required: "You need to set your password for the first time."
        };
      }


    }

  };
});
