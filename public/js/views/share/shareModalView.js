// Filename: views/home/main
// TODO: Confirmation after invite sent

console.log("opened shareModalView");

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./shareModalView',
  'hbs!./shareRow',
  'zeroClipboard'
], function($, _, TroupeViews, template, rowTemplate, zeroClipboard) {

    console.log("Start of shareModalView");

    return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
      this.uri = options.uri;
    },

    getRenderData: function() {
      return {
        uri: this.uri
      };
    },

    events: {
      "click .addrow": "addRow",
      "submit form": "onFormSubmit",
      "hover #copy-button" : "createClipboard",
      "hover #submit-button" : "validateForm"
    },

    validateForm : function () {
      var validateEl = this.$el.find('#share-form');
      validateEl.validate({
        rules: {
          displayName: "required",
          inviteEmail: {
            required: true,
            email: true
            }
        },
        debug: true,
        showErrors: function(errorMap, errorList) {
          console.log("errorList: " + errorList.length);
          console.dir(errorList);
          if (errorList.length === 0) $('.share-failure').hide();
          if (errorList.length > 0) $('.share-failure').show();
          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          $('#failure-text').html(errors);
        },
        messages: {
          displayName: {
            required: "Please tell us your friend's name. "
          },
        inviteEmail : {
          required: "We need to know your friend's email address to send an invite.",
          email: "Hmmm, that doesn't look like an email address."
          }
        }
        });
    },

    createClipboard : function() {
      ZeroClipboard.setMoviePath( 'swf/ZeroClipboard.swf' );
      var clip = new ZeroClipboard.Client();
      clip.setText( 'https://beta.trou.pe/' + this.uri );
      clip.glue( 'copy-button');
    },

    addRow: function(event) {
      var target = $(event.target);
      var rowDiv = target.parent().parent();
      target.remove();
      $(rowTemplate({})).insertAfter(rowDiv);
    },

    afterRender: function(e) {
      $("form", this.el).prepend($(rowTemplate({})));
      // this.createClipboard();
    },

    onFormSubmit: function(e) {
      var invites = [];

      var controlGroups = $("form .control-group", this.$el);
      for(var i = 0; i < controlGroups.length; i++) {
        var cg = controlGroups[i];
        var displayName = $(".f-name", cg).val();
        var email = $(".f-email", cg).val();
        invites.push({
          displayName: displayName,
          email: email
        });
      }

      if(e) e.preventDefault();
      var form = this.$el.find('form');
      var that = this;

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(invites),
        type: "POST",
        success: function(data) {
           if(data.failed) {
            return;
          }
          $('.modal-content').hide();
          $('.modal-success').show();
          that.trigger('share.complete', data);
        }
      });
    }
  });

});