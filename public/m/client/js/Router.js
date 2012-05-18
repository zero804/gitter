define([
  'jquery',
  'underscore',
  'backbone',
  'js/views/chatView',
  'js/views/mailView',
  'js/views/fileView'
], function($, _, Backbone, chatView, mailView, fileView){
  new $.mobile.Router({
    "/chat":   { handler: 'chat', events: "bc" },
    "/mails":   { handler: 'mails', events: "bc" },
    "/files": { handler: 'files', events: "bc" }
  }, {
    chat: function(){
      new chatView().render();
    },

    mails: function(){
      new mailView().render();
    },

    files: function(){
      new fileView().render();
    },

    'default': function(){
      console.log('No route found.');
    }
  }, {
    ajaxApp: true,
    defaultHandler: 'default'
  });
});
