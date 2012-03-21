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
      "click .clickPoint-showEmail": "showEmail"
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

        //Manipulate the date out of ISO format
        //Can probably do a better job here showing cleaner dates, take into account local time zone
        //And probably do this in some function elsewhere
        p1.date = Date.parse(p1.date);
        var d = new Date(p1.date);
        p1.date = d.toUTCString();


        var rowHtml = Mustache.render(rowTemplate, {
          personName: p1.fromName,
          preview: p1.preview,
          subject: p1.subject,
          id: p1._id,
          date: p1.date
        });
        
        $(".frame-mails", this.el).append(rowHtml);
      }
    },

    showEmail: function() {
      //window.troupeApp.showMailDialog(5);
    }
    
  });

  return MailView;
});
