/*jshint unused:strict, browser:true */
define([
  'jquery'
], function($) {
  "use strict";

  // TODO: replace this with backbone events!!!!

  return {
    _JQInit: function() {
      this._JQ = $(this);
    },

    emit: function(event) {
      if(!this._JQ) this._JQInit();

      var args = Array.prototype.slice.call(arguments, 1);
      this._JQ.trigger.call(this._JQ, event, args);
    },

    once: function(evt, handler) {
      if(!this._JQ) this._JQInit();
      this._JQ.one(evt, handler);
    },

    on: function(evt, handler) {
      if(!this._JQ) this._JQInit();
      this._JQ.bind(evt, handler);
    },

    off: function(evt, handler) {
      if(!this._JQ) this._JQInit();
      this._JQ.unbind(evt, handler);
    }

  };

});
