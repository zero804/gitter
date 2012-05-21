define([
       'underscore',
       'backbone',
       'mustache',
       'text!templates/mail/row.mustache'
], function(_, Backbone, Mustache, rowTemplate){

  var MailView = Backbone.View.extend({
    el: '#mail',

    initialize: function(options) {
      //this.router = options.router; THIS DOESNT SEEM TO DO ANYTHING?!
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/mails",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.renderMails(data);
        },
        complete: function() {
          // We need to tell JQM to make this new content into a listview, otherwise the styling isn't applied.
          $('#maillist').listview('refresh');
        }
      });
    },

    render: function() {
      return this;
    },

    renderMails: function(mails) {
      //if (mails.length === 0) $("#frame-help").show(); // TODO IMPLEMENT NO MAIL VIEW
      $("#maillist", this.el).empty();

      while(mails.length > 0) {
        var p1 = mails.shift();

        //TODO: Clever date manipulation for the list view
        
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
          id: p1.id,
          date: p1.date
        });
        
        var item = $(rowHtml);
        $("#maillist", this.el).append(item);
        //item.on('click', this.onClickGenerator(p1.id));
      }
    },

    close: function() {
      console.log("close mailview");
      this.off();
    }

  });

  return MailView;

});
