/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([], function() {
  'use strict';

  var sisyphusPrefix = window.location.hostname;

  var sisyphusKeys = Object.keys(window.localStorage).filter(function(key) {
    return key.indexOf(sisyphusPrefix) === 0;
  });

  sisyphusKeys.forEach(function(key) {
    window.localStorage.removeItem(key);
  });

});
