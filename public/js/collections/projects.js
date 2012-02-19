define([
  'jquery',
  'underscore',
  'backbone',
  'models/projects'
], function($, _, Backbone, projectsModel){
  var ProjectsCollection = Backbone.Collection.extend({
    model: projectsModel,
    url: "api/projects",
    initialize: function() {
    }

  });

  return ProjectsCollection;
});
