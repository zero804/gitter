// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/people/people.mustache',
  'text!templates/people/row.mustache'
], function($, _, Backbone, Mustache, template, rowTemplate){
  var PeopleView = Backbone.View.extend({    
    
    initialize: function() {
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/users",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.renderUsers(data);
        }
      });
    },
    
    events: {
      "click .button-makeAdmin": "makeAdmin",
      "click .button-remove": "removeUser"
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    },
    
    renderUsers: function(users) {
      $(".frame-people", this.el).empty();
      while(users.length > 0) {
        var p1 = users.shift();
        var p2 = users.shift();
        
        var rowHtml = Mustache.render(rowTemplate, { 
          person1Name: p1.displayName,
          person2Name: p2 ? p2.displayName : null,
          person2: p2,
          more: users.length > 0,
          person1MakeAdmin: true,
          person2MakeAdmin: true,
          person1Remove: true,
          person2Remove: true
        });
        
        $(".frame-people", this.el).append(rowHtml);
      }
    },
    
    makeAdmin: function() {
      window.alert("Make Admin");
      return false;
    },
    
    removeUser: function() {
      window.alert("Remove User");
      return false;
    }
    
  });

  return PeopleView;
});
