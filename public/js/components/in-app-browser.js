/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery'
], function($) {
  "use strict";
  console.log('IN APP BROWSER!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');

  document.addEventListener("deviceready", function() {

    $(document).on("click", "a", function(event) {
      var cordova = window.cordova;
      if(!cordova) return;

      console.log('CLICKED');
      console.log(event);

      var strUrl = "http://www.github.com";
      var strWindowName = "InAppBrowser";
      var strWindowFeatures = "";
      function cb() {
      }

      cordova.exec(cb, cb, "InAppBrowser", "open", [strUrl, strWindowName, strWindowFeatures]);
    });

  });


});