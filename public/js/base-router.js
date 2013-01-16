/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'backbone'
], function($, _, Backbone) {
  /*jslint browser: true*/
  "use strict";

  return Backbone.Router.extend({
    routes: {
      '*actions': 'defaultAction'
    },

    createRouteMixins: function() {
      var self = this;

      for(var i = 0; i < arguments.length; i++) {
          var routeMixin  = arguments[i];

          Object.keys(routeMixin).forEach(function(r) {
            var f = routeMixin[r];
            self.route(r, r, f);
          });
      }
    },

    // TODO: FIX This method is fishy!
    resetIcons: function() {
      function removeSelected(selector) {
        var s = $(selector);
        if(s.length === 0) return;
        var src = s.attr("src").replace('-selected.png', ".png");
        s.attr("src", src);
      }
      removeSelected('#chat-icon');
      removeSelected('#file-icon');
      removeSelected('#mail-icon');
      removeSelected('#people-icon');
    },

    navIcon: function(iconId) {
      this.resetIcons();
      //var iconSrc = $(iconId).attr("src").match(/[^\.]+/) + "-selected.png";
      //$(iconId).attr("src", iconSrc);
    },

    /* Taken from http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
    showView: function(selector, view) {
        if (this.currentView)
            this.currentView.close();

        $(selector).html(view.render().el);

        $(window).scrollTop(0);

        this.currentView = view;
        return view;
    },

    showAsync: function(file, params) {
      var self = this;
      require([file],
          function (View) {
            var view = new View({ router: self, params: params });
            self.showView( '#primary-view', view);
          });
    },

    defaultAction: function(actions){
    }
  });
});
