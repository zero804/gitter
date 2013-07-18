/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define(function() {
  "use strict";

  var history = window.logHistory = [];

  function nullLog() {}

  function ieLog(a0) {
    console.log(a0);
  }

  function consoleLog(msg) {
    history.push(msg);
    if(history.length > 500)
      history.shift();

    console.log.apply(console, Array.prototype.slice.apply(arguments));
  }

  if (typeof console == "undefined") return nullLog;
  if (typeof console.log == "object") return ieLog;

  return consoleLog;
});
