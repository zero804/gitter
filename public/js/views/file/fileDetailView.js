/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'views/base',
  'hbs!./tmpl/fileDetailView',
  'hbs!./tmpl/confirmDelete',
  'views/unread-item-view-mixin',
  'cocktail'
], function(TroupeViews, template, confirmDeleteTemplate, UnreadItemViewMixin, cocktail) {
  "use strict";

  var FileDetailView = TroupeViews.Base.extend({
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
      d.fileIcon    = this.model.get('thumbnailUrl');
      d.previewUrl  = '#file/preview/' + d.id;
      d.versionsUrl = '#file/versions/' + d.id;
      d.useSpinner  = !this.hasThumb();
      d.showClose   = !this.options.hideClose;
      d.showActions = !this.options.hideActions;

      return d;
    },

    onDeleteLinkClick: function() {
      var that = this;
      var modal = new TroupeViews.ConfirmationModal({
        title: "Are you sure?",
        body: confirmDeleteTemplate(this.model.toJSON()),
        menuItems: [
          { action: "yes", text: "Yes", additionalClasses: "" },
          { action: "no", text: "No"}
        ]
      });

      modal.on('menuItemClicked', function(id) {
        if (id === "yes")
          that.model.destroy({
          success: function() {
          }
        });

        modal.off('menuItemClicked');
        modal.hide();
      });

      modal.show();
    },

    hasThumb: function() {
      var versions = this.model.get('versions');
      return versions.at(versions.length - 1).get('thumbnailStatus') !== 'GENERATING';
    }

  });
  cocktail.mixin(FileDetailView, UnreadItemViewMixin);

  return FileDetailView;
});
