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
  'collections/conversations',
  'views/file/fileDetailView',
  'views/file/filePreviewView',
  'views/file/fileVersionsView',
  'views/conversation/conversationDetailView'
], function($, _, Backbone, Marionette, TroupeViews, AppIntegratedView, ChatView, FileView, ConversationView, vent, fileModels, conversationModels, FileDetailView, FilePreviewView, FileVersionsView, ConversationDetailView) {
  /*jslint browser: true*/
  /*global require console */
  "use strict";

  $(document).on("click", "a", function(event) {
    if(this.href) {
      var href = $(this).attr('href');
      if(href.substring(0, 2) === "#|") {
        event.preventDefault();

        href = href.substring(2);

        var currentFragment;
        var hash = window.location.hash;

        if(!hash) {
          currentFragment = '#';
        } else {
          currentFragment = hash.split('|', 1)[0];
        }

        window.location = currentFragment + "|" + href;
      }
    }

    return true;
  });

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


  var router;
  var fileCollection, conversationCollection;
  var appView = new AppIntegratedView();

  var Controller = Marionette.Controller.extend({
    initialize: function(options){
      vent.on('navigable-dialog:open', this.onNavigableDialogOpen, this);
      vent.on('navigable-dialog:close', this.onNavigableDialogClose, this);
      vent.on('navigable-dialog:navigate-close', this.onNavigableDialogNavigateClose, this);
    },

    onNavigableDialogNavigateClose: function() {
      var url = window.location.hash.substring(1);
      var parts = url.split('|', 1);

      router.navigate(parts[0], {trigger: true});
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
    },

    showMail: function(id) {
      if(conversationCollection.length === 0) {
        conversationCollection.once('reset', function() { this.showMail(id); }, this);
        return;
      }

      this.closeDialogs();

      var model = conversationCollection.get(id);

      var view = new ConversationDetailView({ id: id, masterModel: model });
      var modal = new TroupeViews.Modal({ view: view, navigable: true });
      modal.show();
    }

  });

  var controller = new Controller();

  var History = function() {
    Backbone.History.apply(this);
  };

  _.extend(History.prototype, Backbone.History.prototype, {
    // Attempt to load the current URL fragment. If a route succeeds with a
    // match, returns `true`. If no defined routes matches the fragment,
    // returns `false`.
    loadUrl: function(fragmentOverride) {
      var fragment = this.fragment = this.getFragment(fragmentOverride);
      if(fragment.indexOf("|") < 0) {
          var args = Array.prototype.slice.apply(arguments);
          return Backbone.History.prototype.loadUrl.apply(this, arguments);
      }

      var fragments = fragment.split("|");
      _.each(fragments, function(fragment) {
        Backbone.History.prototype.loadUrl.call(this, fragment);
      }, this);

      return true;
    }
  });

  var Router = Marionette.AppRouter.extend({
    appRoutes: {
      "":                   "showDefaultView",
      "file/:id":           "showFileDetail",
      "file/preview/:id":   "showFilePreview",
      "file/versions/:id":  "showFileVersions",
      "mail/:id":           "showMail"
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


    conversationCollection = new conversationModels.ConversationCollection();
    conversationCollection.listen();
    conversationCollection.fetch();

    var conversationView = new ConversationView({
      collection: conversationCollection
    });

    app.mailRegion.show(conversationView);

  });
  app.on("initialize:after", function(){
    Backbone.history = new History();

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
