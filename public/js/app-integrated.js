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
  'collections/files',
  'views/file/fileVersionsView'
], function($, _, Backbone, Marionette, AppIntegratedView, ChatView, FileView, ConversationView, vent, fileModels, FileVersionsView) {
  /*jslint browser: true*/
  /*global require console */
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

  var fileCollection;
  var appView = new AppIntegratedView();

  var Controller = Marionette.Controller.extend({
    initialize: function(options){
    },

    showFileDetail: function(id) {
      function showDetail() {
        var view = new FileVersionsView({
          model: fileCollection.get(id)
        });
        app.rightPanelRegion.show(view);
        vent.trigger("detailView:show");
      }

      if(fileCollection.length > 0) {
        showDetail();
      } else {
        fileCollection.once('reset', function() {
          showDetail();
        });
      }
    }
  });

  var controller = new Controller();

  var Router = Marionette.AppRouter.extend({
    appRoutes: {
      "file/:id": "showFileDetail"
    }
  });

  app.addInitializer(function(options){
    var chatView = new ChatView();
    app.chatRegion.show(chatView);

    fileCollection = new fileModels.FileCollection();
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
    Backbone.history.start();
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
