// Filename: router.js
define([
  'jquery',
  'underscore',
  'backbone',
  'models/projects',
  'views/home/main',
  'views/projects/list',
  'views/users/list',
  'views/projects/edit',
  'collections/projects'
], function($, _, Backbone, ProjectsModel, MainHomeView, ProjectListView, userListView, ProjectEditView, ProjectsCollection){
  var projectsCollection = new ProjectsCollection();

  var AppRouter = Backbone.Router.extend({
    routes: {
      // Define some URL routes
      'projects': 'showProjects',
      'projects/new': 'newProject',
      'projects/:id': 'viewProject',
      'users': 'showUsers',

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

    showProjects: function(){
    	this.showView('#page', new ProjectListView({ router: this, collection: projectsCollection }));
    },
    
    // As above, call render on our loaded module
    // 'views/users/list'
    showUsers: function(){
      userListView.render();
    },

    newProject: function() {
      console.log("add");

      this.showView( '#page', new ProjectEditView({ model: new ProjectsModel(), collection: projectsCollection }));
    },
    
    defaultAction: function(actions){
      this.showView( '#page', new MainHomeView({}) );
    }

  });
  
  return new AppRouter();
});
