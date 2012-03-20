// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/mail/mail.mustache',
  'text!templates/mail/row.mustache'
], function($, _, Backbone, Mustache, template, rowTemplate){
  var MailView = Backbone.View.extend({    
    
    initialize: function() {
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/mails",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.renderMails(data);
        }
      });
    },
    
    events: {
      
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { });
      $(this.el).html(compiledTemplate);
      return this;
    },
    
    renderMails: function(mails) {
      $(".frame-mails", this.el).empty();
      while(mails.length > 0) {
        var p1 = mails.shift();
        
        var rowHtml = Mustache.render(rowTemplate, {
          personName: p1.fromName,
          preview: p1.preview,
          subject: p1.subject,
          date: p1.date
        });
        
        $(".frame-mails", this.el).append(rowHtml);
      }
    }
    
  });

  return MailView;
});
