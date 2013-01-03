require([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/chat/chatView'
], function($, _, Backbone, Marionette, ChatView) {
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

  var router = new Router({
    controller: controller
  });

  app.addInitializer(function(options){
    var chatView = new ChatView();
    app.chatRegion.show(chatView);
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
