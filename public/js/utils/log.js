/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false, console:false */
define(function() {
  "use strict";

  /** @define {boolean}  DEBUG */
  var DEBUG = true;
  if (DEBUG) {
    var history = window.logHistory = [];
  }

  function nullLog() {}

  function ieLog(a0) {
    console.log(a0);
  }

  function consoleLog() {
    console.log.apply(console, Array.prototype.slice.apply(arguments));

    if (DEBUG) {
      history.push(Array.prototype.join.call(arguments, ', '));
      if(history.length > 500)
        history.shift();
    }
  }

  if (typeof console == "undefined") return nullLog;
  if (typeof console.log == "object") return ieLog;

  return consoleLog;
});
