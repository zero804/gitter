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

  function initRouter() {
      console.log("ROUTING");

      new $.mobile.Router({
        "#chat":   { handler: 'chat', events: "s" },
        "#mail":   { handler: 'mail', events: "s" },
        "#file": { handler: 'file', events: "s" }
      }, {
        chat: function(){
          console.log("CHAT");
          //new chatView().render();
        },

        mail: function(){
          console.log("MAIL");
          //new mailView().render();
        },

        file: function(){
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
