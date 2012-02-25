// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'views/home/main',
  'views/login/login',
  'views/status/statusView',
  'views/mail/mailView',
  'views/chat/chatView',
  'views/file/fileView',
  'views/people/peopleView'
], function($, _, Backbone, MainHomeView, LoginView, StatusView, MailView, ChatView, FileView, PeopleView){
  var AppRouter = Backbone.Router.extend({
    routes: {
      'statusphere': 'showStatusView',
      'mail': 'showMailView',
      'chat': 'showChatView',
      'files': 'showFileView',
      'people': 'showPeopleView',
      'login': 'showLoginDialog',
      //'projects/:id': 'viewProject',
      
      // Default
      '*actions': 'defaultAction'
    },

    /* Taken from http://coenraets.org/blog/2012/01/backbone-js-lessons-learned-and-improved-sample-app/ */
    showView: function(selector, view) {
        console.log("Current View: " + selector);
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
    
    showLoginDialog: function() {
      var loginView = new LoginView({ router: this });
      loginView.show();
    }
  });
  
  return AppRouter;
});
