/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/shareView',
  'hbs!./tmpl/shareRow',
  'zeroClipboard',
  'jquery_placeholder', // No reference
  'jquery_validate'  // No reference
], function($, _, TroupeViews, template, rowTemplate, ZeroClipboard) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      _.bindAll(this, 'onFormSubmit');
      this.uri = window.troupeContext.troupe.uri;
      this.basePath = window.troupeContext.basePath;
    },

    getRenderData: function() {
      return {
        uri: this.uri,
        basePath: window.troupeContext.basePath
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
      clip.setText( this.basePath + "/" + this.uri );
      clip.glue( 'copy-button');
    },

    addRow: function(event) {
      var target = $(event.target);
      var rowDiv = target.parent().parent();
      target.remove();
      $(rowTemplate({})).insertAfter(rowDiv);
      var displayNameEl = this.$el.find('#displayName');
      displayNameEl.placeholder();
      var emailEl = this.$el.find('#inviteEmail');
      emailEl.placeholder();
    },

    afterRender: function(e) {
      $("form", this.el).prepend($(rowTemplate({})));
      var displayNameEl = this.$el.find('#displayName');
      displayNameEl.placeholder();
      var emailEl = this.$el.find('#inviteEmail');
      emailEl.placeholder();
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

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    }
  });

  return {
    View: View,
    Modal: Modal
  };


});