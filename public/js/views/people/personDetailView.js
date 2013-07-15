/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'utils/context',
  'backbone',
  'views/base',
  'hbs!./tmpl/personDetailView',
  './confirmRemoveModalView',
  'log!person-detail-view'
], function($, _, context, Backbone, TroupeViews, template, ConfirmRemoveModalView, log){
  "use strict";

  return TroupeViews.Base.extend({
    template: template,
    buttonMenu : false,
    events: {
      "click #person-remove-button": "onRemoveClicked"
    },

    initialize: function(options) {
      this.isSelf = (context.getUserId() === this.model.id)  ? true : false;
      this.setRerenderOnChange();
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      d.isSelf = this.isSelf;
      d.troupe = window.troupeContext.troupe;
      // var latestVersion = this.model.get('versions').length - 1;
      // d.fileIcon = '/troupes/' + context.getTroupeId() + '/thumbnails/' + d.fileName + "?version=" + latestVersion;
      // d.previewUrl = '#file/preview/' + d.id;
      // d.versionsUrl = '#file/versions/' + d.id;
      return d;
    },

    onRemoveClicked: function() {
      var that = this;
      var thisPerson = this;
      var view = new ConfirmRemoveModalView({ model: this.model });
      var modal = new TroupeViews.Modal({ view: view  });

      view.on('confirm.yes', function(data) {
          modal.off('confirm.yes');
          modal.hide();
         $.ajax({
            url: "/troupes/" + context.getTroupeId() + "/users/" + this.model.get('id'),
            data: "",
            type: "DELETE",
            success: function(data) {
              log("Removed this person");
              // thisPerson.$el.toggle();
              if (thisPerson.isSelf)
                window.location = window.troupeContext.homeUrl;
              else
                window.location.href = "#!";
            }
          });
      });

      view.on('confirm.no', function(data) {
        modal.off('confirm.no');
        modal.hide();
       });

      modal.show();

      return false;
    }

  });
});
