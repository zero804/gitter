define([
  'jquery',
  'underscore',
  'backbone',
  'views/home/main',
  'views/share/share',
  'components/chat/chat-component',
  'views/app/appView',
  'components/desktopNotifications',
  'components/soundNotifications',
  'ga'
], function($, _, Backbone, MainHomeView, ShareView, chat, AppView, desktopNotifications, soundNotifications, _gaq) {
  _gaq.push(['_setAccount', 'UA-34596351-1']);
  _gaq.push(['_trackPageview']);

  var AppRouter = Backbone.Router.extend({

    initialize: function() {

      this.appView = new AppView({ router: this });

      chat.connect();
    },

    routes: {
      'statusphere': 'showStatusView',
      'mail': 'showConversationView',
      'mail/:id': 'showConversationDetailView',
      'chat': 'showChatView',
      'files': 'showFileView',
      'people': 'showPeopleView',
      'profile': 'showProfileView',

      // Default
      '*actions': 'defaultAction'
    },

    /* Taken from http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
    showView: function(selector, view) {
        if (this.currentView)
            this.currentView.close();

        $(selector).html(view.render().el);

        this.currentView = view;
        return view;
    },

    showAsync: function(file, params) {
      var self = this;
      require([file],
          function (View) {
            var view = new View({ router: self, params: params });
            self.showView( '#primary-view', view);
          });
    },

    defaultAction: function(actions){
      // this.showView( '#primary-view', new MainHomeView({}) );
      this.showChatView();
    },

    showStatusView: function() {
      _gaq.push(['_trackEvent', 'page', 'status', 'status']);

      this.showAsync('views/status/statusView');
    },

    showConversationView: function() {
      _gaq.push(['_trackEvent', 'page', 'conversation', 'conversation']);

      this.showAsync('views/conversation/conversationView');
    },

    showConversationDetailView: function(id) {
      _gaq.push(['_trackEvent', 'page', 'conversationDetail', 'conversationDetail']);

      this.showAsync("views/conversation/conversationDetailView",id);
    },

    showChatView: function() {
      _gaq.push(['_trackEvent', 'page', 'chat', 'chat']);

      this.showAsync('views/chat/chatView');
    },

    showFileView: function() {
      _gaq.push(['_trackEvent', 'page', 'file', 'file']);

      this.showAsync('views/file/fileView');
    },

    showPeopleView: function() {
      _gaq.push(['_trackEvent', 'page', 'people', 'people']);

      this.showAsync("views/people/peopleView");
    },

    showShareDialog: function() {
      _gaq.push(['_trackEvent', 'page', 'share', 'share']);

      var loginView = new ShareView({ router: this });
      loginView.show();
    },

    showMailItemView: function(id) {
      this.showAsync("views/mail/itemView",id);
    },

    showProfileView: function() {
      _gaq.push(['_trackEvent', 'page', 'profile', 'profile']);

      this.showAsync("views/profile/profileView");
    }
  });

  return AppRouter;
});
