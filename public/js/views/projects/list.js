define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/projects/list.mustache',
  'router'

], function($, _, Backbone, Mustache, projectListTemplate, router){
  var ProjectListView = Backbone.View.extend({
    events: {
        "click .add": "add"
    },

    initialize: function(){
    	this.router = this.options.router;
    },

    exampleBind: function( model ){
      //console.log(model);
    },
    
    render: function(){
      var data = {
        projects:  _.map(this.collection.models, function(v) { return v.toJSON(); })
      };
      
      var compiledTemplate = Mustache.render(projectListTemplate, data);
      $(this.el).html(compiledTemplate);
      return this;
      
    },
    
    add: function() {
    	this.router.navigate("projects/new");
    }
    
  });

  return ProjectListView;
});
