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
      this.resetIcons();
      this.showAsync('views/conversation/conversationView');
      var mailIconSrc = $('#mail-icon').attr("src").match(/[^\.]+/) + "-selected.png";
      $('#mail-icon').attr("src", mailIconSrc);
    },

    showConversationDetailView: function(id) {
      this.showAsync("views/conversation/conversationDetailView",id);
    },

    showChatView: function() {
      this.resetIcons();
      this.showAsync('views/chat/chatView');
      var chatIconSrc = $('#chat-icon').attr("src").match(/[^\.]+/) + "-selected.png";
      $('#chat-icon').attr("src", chatIconSrc);
    },

    showFileView: function() {
      this.resetIcons();
      this.showAsync('views/file/fileView');
      var fileIconSrc = $('#file-icon').attr("src").match(/[^\.]+/) + "-selected.png";
      $('#file-icon').attr("src", fileIconSrc);
    },

    showPeopleView: function() {
      this.resetIcons();
      this.showAsync("views/people/peopleView");
      var peopleIconSrc = $('#people-icon').attr("src").match(/[^\.]+/) + "-selected.png";
      $('#people-icon').attr("src", peopleIconSrc);
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
