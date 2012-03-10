// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'views/home/main',
  'views/share/share',
  'views/status/statusView',
  'views/mail/mailView',
  'views/chat/chatView',
  'views/file/fileView',
  'views/people/peopleView'
], function($, _, Backbone, MainHomeView, ShareView, StatusView, MailView, ChatView, FileView, PeopleView){
  var AppRouter = Backbone.Router.extend({
    routes: {
      'statusphere': 'showStatusView',
      'mail': 'showMailView',
      'chat': 'showChatView',
      'files': 'showFileView',
      'people': 'showPeopleView',
      
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

    defaultAction: function(actions){
      this.showView( '#primary-view', new MainHomeView({}) );
    },

    showStatusView: function() {
      this.showView( '#primary-view', new StatusView({}) );
    },
    
    showMailView: function() {
      this.showView( '#primary-view', new MailView({}) );
    },
    
    showChatView: function() {
      this.showView( '#primary-view', new ChatView({}) );      
    },
    
    showFileView: function() {
      this.showView( '#primary-view', new FileView({}) );      
    },  
    
    showPeopleView: function() {
      this.showView( '#primary-view', new PeopleView({}) );            
    },
    
    showShareDialog: function() {
      var loginView = new ShareView({ router: this });
      loginView.show();
    }
  });
  
  return AppRouter;
});
