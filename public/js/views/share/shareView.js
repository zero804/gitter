/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/shareView',
  'hbs!./tmpl/shareRow',
  'zeroclipboard',
  './shareTableView',
  'jquery-placeholder', // No reference
  'jquery-validate'  // No reference
], function($, _, TroupeViews, template, rowTemplate, ZeroClipboard, ShareTableView) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    events: {
      "submit form": "onFormSubmit",
      "hover #copy-button" : "createClipboard",
      "hover #submit-button" : "validateForm"
    },

    initialize: function() {
      _.bindAll(this, 'onFormSubmit');
      this.uri = window.troupeContext.troupe.uri;
      this.basePath = window.troupeContext.basePath;
      this.shareTableView = new ShareTableView({});
      this.addCleanup(function() {
        if(this.clip) this.clip.destroy();
      });
    },

    getRenderData: function() {
      return {
        uri: this.uri,
        basePath: window.troupeContext.basePath
      };
    },

    createClipboard : function() {
      if(this.clip) return;

      console.log("CREATING");
      ZeroClipboard.setMoviePath( 'repo/zeroclipboard/ZeroClipboard.swf' );
      ZeroClipboard.Client.prototype.zIndex = 100000;
      var clip = new ZeroClipboard.Client();
      clip.setText( this.basePath + "/" + this.uri );
      clip.glue( 'copy-button');
      this.clip=clip;
    },

    afterRender: function() {
      // prepend it to the form, because the submit buttons are below
      this.$el.find("form").prepend(this.shareTableView.el);
    },

    validateForm : function () {
      var validationConfig = _.extend(this.shareTableView.getValidationConfig(), {
        showErrors: function(errorMap, errorList) {
          if (errorList.length === 0) $('.share-failure').hide();
          if (errorList.length > 0) $('.share-failure').show();
          var errors = "";
          $.each(errorList, function () { errors += this.message + "<br>"; });
          $('#failure-text').html(errors);
        }
      });

      this.$el. find('#share-form').validate(validationConfig);
    },

    onFormSubmit: function(e) {

      var self = this, invites = this.shareTableView.serialize();

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
          self.trigger('share.complete', data);
        }
      });

      if(e) e.preventDefault();

    }
  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function() {
      TroupeViews.Modal.prototype.initialize.apply(this, arguments);
      this.view = new View({ });
    }
  });

  return {
    View: View,
    Modal: Modal
  };


});