// Filename: views/home/main

// TODO: Better way to show the subject here, right now it will be set multiple times as this is called per conversationDetailItemView

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!views/conversation/conversationDetailItemView',
  'hbs!views/conversation/conversationDetailItemViewBody',
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
      this.initialIndex = options.index;
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      data.personName = data.from.displayName;
      data.avatarUrl = data.from.avatarUrl;

      if (data.attachments.length===0) { data.hasAttachments = false; } else { data.hasAttachments = true; }

      data.date = data.date.calendar();

      data.initialIndex = this.initialIndex;
      return data;
    },

    afterRender: function() {
      if(this.initialIndex === 0) {
          var mailbody = this.generateMailBody();

          this.$el.find("#initialBody").replaceWith(mailbody);
          this.$el.find('.trpMailPreview').css("visibility","hidden");
      }
    },

    onHeaderClick: function(event) {
      if(this.mailbody) {
        $(this.mailbody).toggle();
        // For some reason using toggle (which adjusts css display property) causes other issues, so this just toggles visibility
        if(this.$el.find('.trpMailPreview').css("visibility") == 'hidden') {
          this.$el.find('.trpMailPreview').css("visibility","visible");
          return false;
        }
        this.$el.find('.trpMailPreview').css("visibility","hidden");
        return false;
      }

      var mailbody = this.generateMailBody();

      this.$el.append(mailbody);
      this.$el.find('.trpMailPreview').css("visibility","hidden");

      return false;

    },

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
    }

  });
});
