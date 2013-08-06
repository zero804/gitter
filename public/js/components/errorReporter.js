/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
], function() {
  "use strict";

  var _super = window.onerror;
  window.onerror = function(message, file, line) {
  	try {
	    require(['utils/tracking'], function(tracking) {
	      try {
	      	tracking.trackError(message, file, line);
	      } catch(e) {
	      	//
	      }
	    });
    } catch(e) {
    	//
    }

    if (_super)
      return _super();
  };

});