// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/mail/item.mustache',
], function($, _, Backbone, Mustache, template, rowTemplate) {
  var FullMailView = Backbone.View.extend({ 
    events: {

    },
    
    initialize: function(options) {
     this.router = options.router;
     this.id = options.params;
     this.load();
    },

    load: function() {
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/mails/" + this.id,
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.mail = data;
          self.renderMailItem();
        }
      });

    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template);
      $(this.el).html(compiledTemplate);
      //$("form", this.el).append($(rowTemplate));
      
      return this;
    },
    
    renderMailItem: function() {
      $('.label-subject',this.el).text(this.mail.subject);
      $('.label-body',this.el).text(this.mail.mail);
    }


    
    
  });

  return FullMailView;
});
