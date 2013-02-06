/*jshint unused:true browser:true*/


// TODO: Better way to show the subject here, right now it will be set multiple times as this is called per conversationDetailItemView

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/conversationDetailItemView',
  'hbs!./tmpl/conversationDetailItemViewBody',
  'views/widgets/avatar',
  '../../utils/momentWrapper'
], function($, _, Backbone, TroupeViews, template, bodyTemplate, AvatarView, moment) {
  return TroupeViews.Base.extend({
    template: template,

    events: {
      "click .clickPoint-showEmail": "onHeaderClick"
    },

    attributes: {
      'class': 'trpMailRowContainer'
    },

    initialize: function(options) {
      this.index = options.index;
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.personName = data.from.displayName;
      data.avatarUrlSmall = data.from.avatarUrlSmall;
      data.avatarUrlMedium = data.from.avatarUrlMedium;

      if (data.attachments.length===0) { data.hasAttachments = false; } else { data.hasAttachments = true; }

      data.date = data.date.calendar();

      data.mail = data.mail.replace(/\t/g, '    ')
       .replace(/  /g, '&nbsp; ')
       .replace(/  /g, ' &nbsp;') // handles "W&nbsp;  W"
       .replace(/\r\n|\n|\r/g, '<br />');

      data.index = this.index;
      return data;
    },

    afterRender: function() {
      /*
      if(this.initialIndex === 0) {
          var mailbody = this.generateMailBody();

          this.$el.find("#initialBody").replaceWith(mailbody);
          this.$el.find('.trpMailPreview').hide();
      }
      */
      // create and show the FULL mail body for the first mail
    },

    onHeaderClick: function(/*event*/) {
      var $preview = this.$el.find('.trpMailPreview');
      var $mailBody = this.$el.find('.trpMailExpanded');
      var showingPreview = this.$el.find('.trpMailPreview').is(':visible');

      // For some reason using toggle (which adjusts css display property) causes other issues, so this just toggles visibility
      if(showingPreview) {
        $preview.hide();
        $mailBody.show();
      }
      else {
        $mailBody.hide();
        $preview.show();
      }

      return false;
    }/*,

    generateMailBody: function() {
      if(this.mailbody) {
        return this.mailbody;
      }

      var data = this.getRenderData();
      data.mail = data.mail.replace(/\t/g, '    ')
       .replace(/  /g, '&nbsp; ')
       .replace(/  /g, ' &nbsp;') // handles "W&nbsp;  W"
       .replace(/\r\n|\n|\r/g, '<br />');

      this.mailbody = $(bodyTemplate(data));
      return this.mailbody;
    }*/

  });
});
