require([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'views/app/appIntegratedView',
  'views/chat/chatView',
  'views/file/fileView',
  'views/conversation/conversationView',
  'utils/vent',
  'collections/files',
  'views/file/fileDetailView',
  'views/file/filePreviewView',
  'views/file/fileVersionsView'
], function($, _, Backbone, Marionette, TroupeViews, AppIntegratedView, ChatView, FileView, ConversationView, vent, fileModels, FileDetailView, FilePreviewView, FileVersionsView) {
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
      vent.on('navigable-dialog:open', this.onNavigableDialogOpen, this);
      vent.on('navigable-dialog:close', this.onNavigableDialogClose, this);
    },

    onNavigableDialogOpen: function(dialog) {
      if(this.currentModal) {
        console.warn("Already a navigable dialog!");
      }
      this.currentModal = dialog;
    },

    onNavigableDialogClose: function(dialog) {
      this.currentModal = null;
    },

    closeDialogs: function() {
      if(this.currentModal) {
        this.currentModal.navigationalHide();
        this.currentModal = null;
      }
    },

    showDefaultView: function(id) {
      this.closeDialogs();
      app.rightPanelRegion.reset();
      vent.trigger("detailView:hide");
    },

    showFileDetail: function(id) {
      // Do we need to wait for file collection to load?
      if(fileCollection.length === 0) {
        fileCollection.once('reset', function() { this.showFileDetail(id); }, this);
        return;
      }

      this.closeDialogs();

      var model = fileCollection.get(id);
      var view = new FileDetailView({
        model: model
      });
      app.rightPanelRegion.show(view);
      vent.trigger("detailView:show");
    },

    showFilePreview: function(id) {
      // Do we need to wait for file collection to load?
      if(fileCollection.length === 0) {
        fileCollection.once('reset', function() { this.showFilePreview(id); }, this);
        return;
      }

      this.closeDialogs();

      var self = this;
      var currentModel = fileCollection.get(id);

      // TODO: move this gunk somewhere else!!
      var navigationController = {
        hasNext: function() {
          var i = fileCollection.indexOf(currentModel);
          return i < fileCollection.length - 1;
        },

        getNext: function() {
          var i = fileCollection.indexOf(currentModel);
          if(i < fileCollection.length - 1) {
            currentModel = fileCollection.at(i + 1);
            return currentModel;
          }
          return null;
        },

        hasPrevious: function() {
          var i = fileCollection.indexOf(currentModel);
          return i > 0;
        },

        getPrevious: function() {
          var i = fileCollection.indexOf(currentModel);
          if(i > 0) {
            currentModel = fileCollection.at(i - 1);
            return currentModel;
          }
          return null;
        }
      };

      var view = new FilePreviewView({ model: currentModel, navigationController: navigationController });
      var modal = new TroupeViews.Modal({
        view: view,
        className: 'modal trpFilePreview',
        navigable: true,
        menuItems: [{
          id: "download",
          text: "Download"
        }]
      });
      modal.show();
    },

    showFileVersions: function(id) {
      // Do we need to wait for file collection to load?
      if(fileCollection.length === 0) {
        fileCollection.once('reset', function() { this.showFileVersions(id); }, this);
        return;
      }

      this.closeDialogs();

      var model = fileCollection.get(id);

      var view = new FileVersionsView({ model: model });
      var modal = new TroupeViews.Modal({ view: view, navigable: true });
      modal.show();

      return false;
    }

  });

  var controller = new Controller();

  var Router = Marionette.AppRouter.extend({
    appRoutes: {
      "":                 "showDefaultView",
      "file/:id":         "showFileDetail",
      "file/preview/:id": "showFilePreview",
      "file/versions/:id": "showFileVersions"

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
