require.config({
  paths: {
    jquery: 'libs/jquery/jquery-min',
    jquery_validate : 'libs/jquery.validate-1.9/jquery.validate.min',
    bootstrap: '../bootstrap/js/bootstrap.min',
    underscore: 'libs/underscore/underscore-1.3.1-min',
    backbone: 'libs/backbone/backbone-0.9.1',
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
  'bootstrap'
], function($, _, Backbone, AppRouter, Bootstrap) {
  
  /* From http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
  Backbone.View.prototype.close = function () {
    console.log('Closing view ' + this);
    if (this.beforeClose) {
      this.beforeClose();
    }
    this.remove();
    this.unbind();
  };

  $('.dp-tooltip').tooltip();
  $('.chat-bubble').tooltip();

  var router = new AppRouter();
    
  Backbone.history.start();

  if(!window.troupeContext) {
    router.navigate("login", {trigger: true});
  }
  
});
