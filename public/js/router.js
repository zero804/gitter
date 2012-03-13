// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'views/home/main',
  'views/share/share'
], function($, _, Backbone, MainHomeView, ShareView){
  var AppRouter = Backbone.Router.extend({
    routes: {
      'statusphere': 'showStatusView',
      'mail': 'showMailView',
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
    
    showAsync: function(file) {
      var self = this;
      require([file],
          function (View) {
            var view = new View({ router: self });
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
    
    showProfileView: function() {
      this.showAsync("views/profile/profileView");
    }
  });
  
  return AppRouter;
});
