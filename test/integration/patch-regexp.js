/* jshint node:true */
"use strict";

module.exports = {
  patch: function() {
    var test = RegExp.prototype.test;
    RegExp.prototype.test = function() {
      console.log(".test", this, arguments);
      return test.apply(this, arguments);
    };

    var exec = RegExp.prototype.exec;
    RegExp.prototype.exec = function() {
      console.log(".match", this, arguments);
      return exec.apply(this, arguments);
    };
  }
};
