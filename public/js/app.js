// Filename: app.js
define([
  'jquery',
  'underscore',
  'backbone',
  'router', 
], function($, _, Backbone, router) {
    var initialize = function() {  
	
	    /* From http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
	    Backbone.View.prototype.close = function () {
	      console.log('Closing view ' + this);
	      if (this.beforeClose) {
	        this.beforeClose();
	      }
	      this.remove();
	      this.unbind();
	    };
	
	    Backbone.history.start();
    };
	
    return {
      initialize: initialize
    };

});
