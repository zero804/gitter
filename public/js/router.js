require([
  'jquery',
  'underscore',
  'backbone',
  './base-router',
  'views/home/main',
  'views/share/share',
  'components/chat/chat-component',
  'views/app/appView',
  'components/desktopNotifications',
  'components/soundNotifications',
  'components/unread-items-client',
  'routes/mail-routes'
], function($, _, Backbone, BaseRouter, MainHomeView, ShareView, chat, AppView, desktopNotifications, soundNotifications, unreadItemsClient, mailRoutes) {

  var AppRouter = BaseRouter.extend({
    initialize: function() {
      this.createRouteMixins(mailRoutes);

      this.appView = new AppView({ router: this });

      chat.connect();
    },

    routes: {
      'statusphere': 'showStatusView',

      'chat': 'showChatView',
      'files': 'showFileView',
      'people': 'showPeopleView',
      'profile': 'showProfileView',

      // Default
      '*actions': 'defaultAction'
    },

    defaultAction: function(actions){
      this.showChatView();
    },

    showStatusView: function() {
      this.showAsync('views/status/statusView');
    },


    showChatView: function() {
      this.navIcon('#chat-icon');
      this.showAsync('views/chat/chatView');
    },

    showFileView: function() {
      this.navIcon('#file-icon');
      this.showAsync('views/file/fileView');
    },

    showPeopleView: function() {
      this.navIcon('#people-icon');
      this.showAsync("views/people/peopleView");
    },

    showShareDialog: function() {
      var loginView = new ShareView({ router: this });
      loginView.show();
    },

    showProfileView: function() {
      this.showAsync("views/profile/profileView");
    }
  });

  var appRouter = new AppRouter();

  // THESE TWO LINES WILL NOT REMAIN HERE FOREVER
  //$('.dp-tooltip').tooltip();
  //$('.chat-bubble').tooltip();

  window.troupeApp = appRouter;
  Backbone.history.start();
  //Backbone.history.start({pushState: true, root: window.location.pathname + "/"});

  // Asynchronously load tracker
  require([
    'utils/tracking'
  ], function(tracking) {
    // No need to do anything here
  });

  return appRouter;
});
