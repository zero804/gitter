require([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/app/appIntegratedView',
  'views/chat/chatView',
  'views/file/fileView',
  'views/conversation/conversationView',
  'utils/vent',
  'collections/files'

], function($, _, Backbone, Marionette, AppIntegratedView, ChatView, FileView, ConversationView, vent, fileModels) {
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
    rightPanelRegion: "#right-panel",
    modalRegion: "#modal-panel"
  });

  var appView = new AppIntegratedView();

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

    var fileCollection = new fileModels.FileCollection();
    fileCollection.listen();
    fileCollection.fetch();

    var fileView = new FileView({
      collection: fileCollection
    });
    app.fileRegion.show(fileView);

    var conversationView = new ConversationView();
    app.mailRegion.show(conversationView);

  });

  var router;
  app.on("initialize:after", function(){
    router = new Router({
      controller: controller
    });

    router.initialize();
    Backbone.history.start({pushState: true});
  });

  vent.on("conversation:view", function(model) {
    window.alert("Conversation view: " + model.id);
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
