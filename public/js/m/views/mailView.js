define([
       'underscore',
       'backbone',
       'mustache',
       '/js/utils/utils.js',
       'text!templates/mail/row.mustache',
       'text!templates/mail/divider.mustache'
], function(_, Backbone, Mustache, utils, rowTemplate, dividerTemplate){

  var MailView = Backbone.View.extend({
    el: '#mail',

    initialize: function(options) {
      //this.router = options.router;
      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/mails",
        contentType: "application/json",
        dataType: "json",
        type: "GET",
        success: function(data) {
          self.renderMails(data);
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

      var mailsByDate = utils.index(mails, function(mail) {
        return utils.extractDateFromDateTime(new Date(mail.date));
      });

      var dates = _.keys(mailsByDate);
      dates.sort();

      for(var i = 0; i < dates.length; i++) {
        var date =  dates[i];
        var mailsForDate = mailsByDate[date];

        var dividerHtml = Mustache.render(dividerTemplate, {
          date: utils.formatDate(new Date(date)),
          count: mailsForDate.length
        });

        $("#maillist", this.el).append($(dividerHtml));

        for(var j = 0; j < mailsForDate.length; j++) {
          var mail = mailsForDate[j];

          //TODO: Clever date manipulation for the list view
          //Manipulate the date out of ISO format
          //Can probably do a better job here showing cleaner dates, take into account local time zone
          //And probably do this in some function elsewhere

          var rowHtml = Mustache.render(rowTemplate, {
            personName: mail.fromName,
            preview: mail.preview,
            subject: mail.subject,
            time: utils.extractTimeFromDateTime(new Date(mail.date)),
            id: mail.id
          });

          var item = $(rowHtml);
          $("#maillist", this.el).append(item);
        }
      }

      while(mails.length > 0) {
        var p1 = mails.shift();
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
