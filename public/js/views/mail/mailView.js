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
    
    initialize: function(options) {
      this.router = options.router;
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
      //"click .clickPoint-showEmail": "showEmail"
    },
    
    render: function() {
      var self = this;
      // we probably want to pull in the domain from config, e.g. for beta.trou.pe
      var emailAddress = window.troupeContext.troupe.uri + '@beta.trou.pe';
      var compiledTemplate = Mustache.render(template, {
        emailAddress: emailAddress
      });
      $(this.el).html(compiledTemplate);
      return this;
    },

    onClickGenerator: function(id) {
      var self = this;

      return function() {
        self.router.navigate("mail/" + id, {trigger: true});
      };
    },

    renderMails: function(mails) {

      if (mails.length === 0) $("#frame-help").show();
      $(".frame-mails", this.el).empty();

      while(mails.length > 0) {
        var p1 = mails.shift();

        //Manipulate the date out of ISO format
        //Can probably do a better job here showing cleaner dates, take into account local time zone
        //And probably do this in some function elsewhere
        p1.date = Date.parse(p1.date);
        var d = new Date(p1.date);
        p1.date = d.toUTCString();

        // will sort this out properly, bloody dates
        p1.date = "Aug 22nd";

        var rowHtml = Mustache.render(rowTemplate, {
          personName: p1.fromName,
          preview: p1.preview,
          subject: p1.subject,
          id: p1.id,
          date: p1.date
        });
        
        var item = $(rowHtml);
        $(".frame-mails", this.el).append(item);
        item.on('click', this.onClickGenerator(p1.id));
// WHY WONT THIS WORK GIVES SYNTAX ERROR
//         var p=$('#fos p');
// var divh=$('#fos').height();
// while ($(p).outerHeight()>divh) {
//     $(p).text(function (index, text) {
//         return text.replace(/\W*\s(\S)*$/, '...');
//     });
// }​

      }
    },

    showEmail: function() {
      //window.troupeApp.showMailDialog(5);
    }
    
  });

  return MailView;
});
