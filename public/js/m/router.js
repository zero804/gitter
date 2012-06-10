/*jshint globalstrict:true, trailing:false */
/*global require: true, module: true, console: true */
define([
  'jquery',
  'jqueryM',
  'jquery.mobile.router',
  'underscore',
  'backbone',
  '/js/m/views/chatView.js',
  '/js/m/views/mailView.js',
  '/js/m/views/mailItemView.js',
  '/js/m/views/fileView.js'
], function($, $$, _, jqmRouter, Backbone, ChatView, MailView, MailItemView, FileView) {
  "use strict";
  function initRouter() {
      console.log("ROUTING");

      var router;
      /* Taken from http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
      function showView(view) {
          if (router.currentView)
              router.currentView.close();

          view.render();

          router.currentView = view;
          return view;
      }

      router = new $.mobile.Router({
        "#chat":   { handler: 'chat', events: "s" },
        "#mail":   { handler: 'mail', events: "s" },
        "#mailitem([?](.*))?":   { handler: 'mailitem', events: "s" },
        "#file": { handler: 'file', events: "s" }
      }, {
        chat: function(){
          console.log("CHAT");
          showView(new ChatView());
        },

        mail: function(){
          console.log("MAIL");
          showView(new MailView());
        },

        mailitem: function(eventName, urlMatches){
          console.log("MAILITEM");
          var id = urlMatches[2];
          console.dir(arguments);
          showView(new MailItemView({id: id}));
        },

        file: function(){
          console.log("FILE");
          showView(new FileView());
          //new fileView().render();
        },

        'default': function(){
          console.log('No route found.');
        }
      }, {
        ajaxApp: false,
        defaultHandler: 'chat'
      });
  }

    if($.mobile) {
      initRouter();
    } else {
      $(document).bind("mobileinit",function(){
        initRouter();
      });
    }
});
