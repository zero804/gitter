// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'views/home/main',
  'views/share/share',
  'components/chat/chat-component'
], function($, _, Backbone, MainHomeView, ShareView, chat){
  var AppRouter = Backbone.Router.extend({
    
    initialize: function() {
      chat.connect();
    },
    
    routes: {
      'statusphere': 'showStatusView',
      'mail': 'showMailView',
      'mail/:id': 'showMailItemView',
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
      this.showView( '#primary-view', new MainHomeView({}) );
    },

    showStatusView: function() {
      this.showAsync('views/status/statusView');
    },
    
    showMailView: function() {
      this.showAsync('views/mail/mailView');
    },
    
    showChatView: function() {
      this.showAsync('views/chat/chatView');
    },
    
    showFileView: function() {
      this.showAsync('views/file/fileView');
    },
    
    showPeopleView: function() {
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
  
  return AppRouter;
});
