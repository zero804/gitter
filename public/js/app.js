require.config({
  paths: {
    jquery: 'libs/jquery/jquery-min',
    jquery_validate : 'libs/jquery.validate-1.9/jquery.validate.min',
    underscore: 'libs/underscore/underscore-min',
    backbone: 'libs/backbone/backbone-optamd3-min',
    text: 'libs/require/text',
    mustache: 'libs/mustache/mustache',
    templates: '../templates'
  },
  priority: ['jquery']
});

require([
  'jquery',
  'underscore',
  'backbone',
  'router', 
], function($, _, Backbone, router) {
  
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

});
