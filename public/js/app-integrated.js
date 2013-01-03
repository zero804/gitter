require([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/chat/chatView',
  'views/file/fileView',
  'views/conversation/conversationView'
], function($, _, Backbone, Marionette, ChatView, FileView, ConversationView) {
  /*jslint browser: true*/
  /*global require */
  "use strict";

  var app = new Marionette.Application();
  app.addRegions({
    leftMenuRegiom: "#left-menu",
    chatRegion: "#chat-frame",
    peopleRosterRegion: "#people-roster",
    fileRegion: "#file-list",
    mailRegion: "#mail-list",
    rightPanelRegion: "#right-panel"
  });


  var Controller = Marionette.Controller.extend({
    initialize: function(options){
    },

    doStuff: function(){
      this.trigger("stuff:done", this.stuff);
    }
  });

  var controller = new Controller();

  var Router = Marionette.AppRouter.extend({
    appRoutes: {
      "some/route": "doStuff"
    }
  });

  app.addInitializer(function(options){
    var chatView = new ChatView();
    app.chatRegion.show(chatView);

    //var fileView = new FileView();
    //app.fileRegion.show(fileView);

    var conversationView = new ConversationView();
    app.mailRegion.show(conversationView);

  });

  app.on("initialize:after", function(){
    var router = new Router({
      controller: controller
    });

    router.initialize();
    Backbone.history.start();
  });

  // Asynchronously load tracker
  /*
  not working with marionette yet
  require([
    'utils/tracking'
  ], function(tracking) {
    // No need to do anything here
  });
  */

  app.start();

  return app;
});
