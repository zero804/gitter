/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/fileDetailView',
  'hbs!./tmpl/confirmDelete'
], function($, _, Backbone, TroupeViews, template, confirmDeleteTemplate) {
  "use strict";

  return TroupeViews.Base.extend({
    unreadItemType: 'file',
    template: template,
    buttonMenu : false,
    events: {
      "click .link-delete":   "onDeleteLinkClick"
    },

    initialize: function(/*options*/) {
      this.setRerenderOnChange();
    },

    getRenderData: function () {
      var d = this.model.toJSON();
      d.fileIcon = this.model.get('thumbnailUrl');
      d.previewUrl = '#file/preview/' + d.id;
      d.versionsUrl = '#file/versions/' + d.id;
      d.useSpinner = !this.hasThumb();

      return d;
    },

    onDeleteLinkClick: function() {
      var that = this;
      var modal = new TroupeViews.ConfirmationModal({
        title: "Are you sure?",
        body: confirmDeleteTemplate(this.model.toJSON()),
        buttons: [
          { id: "yes", text: "Yes", additionalClasses: "" },
          { id: "no", text: "No"}
        ]
      });

      modal.on('button.click', function(id) {
        if (id === "yes")
          that.model.destroy({
          success: function(model, response) {
          }
        });

        modal.off('button.click');
        modal.hide();
      });

      modal.show();
    },

    hasThumb: function() {
      var versions = this.model.get('versions');
      return versions.at(versions.length - 1).get('thumbnailStatus') !== 'GENERATING';
    }

  });
});
