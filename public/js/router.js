define([
  'jquery',
  'underscore',
  'backbone',
  'views/home/main',
  'views/share/share',
  'components/chat/chat-component',
  'views/app/appView',
  'components/desktopNotifications',
  'components/soundNotifications'
], function($, _, Backbone, MainHomeView, ShareView, chat, AppView, desktopNotifications, soundNotifications) {

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

    resetIcons: function() {
      var chatIconSrc = $('#chat-icon').attr("src").replace('-selected.png', ".png");
      var fileIconSrc = $('#file-icon').attr("src").replace('-selected.png', ".png");
      var mailIconSrc = $('#mail-icon').attr("src").replace('-selected.png', ".png");
      var peopleIconSrc = $('#people-icon').attr("src").replace('-selected.png', ".png");
      $('#chat-icon').attr("src", chatIconSrc);
      $('#file-icon').attr("src", fileIconSrc);
      $('#mail-icon').attr("src", mailIconSrc);
      $('#people-icon').attr("src", peopleIconSrc);
    },

    navIcon: function(iconId) {
      this.resetIcons();
      var iconSrc = $(iconId).attr("src").match(/[^\.]+/) + "-selected.png";
      $(iconId).attr("src", iconSrc);
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
      this.showAsync('views/status/statusView');
    },

    showConversationView: function() {
      this.navIcon('#mail-icon');
      this.showAsync('views/conversation/conversationView');
    },

    showConversationDetailView: function(id) {
      this.showAsync("views/conversation/conversationDetailView",id);
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

    showMailItemView: function(id) {
      this.showAsync("views/mail/itemView",id);
    },

    showProfileView: function() {
      this.showAsync("views/profile/profileView");
    }
  });

  return new AppRouter();
});
