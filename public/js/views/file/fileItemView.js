/*jshint unused:true browser:true*/
define([
  'jquery',
  'underscore',
  'backbone',
  'marionette',
  'views/base',
  'hbs!./tmpl/fileItemView'
], function($, _, Backbone, Marionette, TroupeViews, template) {
  /*jslint browser: true*/
  "use strict";

  return TroupeViews.Base.extend({
    unreadItemType: 'file',
    tagName: 'span',
    template: template,
    initialize: function() {
      this.setRerenderOnChange();
    },

    getRenderData: function(){
      var data = this.model.toJSON();

      var versions = this.model.get('versions');

      var latestVersion = versions.length;
      data.fileIcon = this.fileIcon(this.model.get('fileName'), latestVersion);
      data.useSpinner = versions.at(versions.length - 1).get('thumbnailStatus') === 'GENERATING';

      return data;
    },

    render: function() {
      var r = TroupeViews.Base.prototype.render.call(this);

      var firstChild = this.$el.find(':first-child');
      // tooltips aren't loaded on mobile, they don't work
      if (firstChild.tooltip) {
        firstChild.tooltip({
          html : true,
          placement : "right"
        });
      }

      return r;
    },

    fileIcon: function(fileName, version) {
      return '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + fileName + "?version=" + version;
    }
  });

  // TODO: DELETE THIS STUFF?

  /*

  return TroupeViews.Base.extend({
    events: {
      "click .trpFileActionMenuButton": "showFileActionMenu",
      "click .link-preview": "onPreviewLinkClick",
      "click .link-delete":  "onDeleteLinkClick",
      "click .link-versions":  "onVersionsLinkClick"
    },

    initialize: function(options) {
      var self = this;
      _.bindAll(this, 'rerender', 'onPreviewLinkClick', 'showFileActionMenu', 'hideFileActionMenu', 'onDeleteLinkClick', 'onVersionsLinkClick');
      this.parentCollection = options.parentCollection;

      this.model.on('change:versions', this.rerender);

      this.addCleanup(function() {
        self.model.off('change:versions');
      });
    },

    getRenderData: function() {
      var data = this.model.toJSON();
      var latestVersion = this.model.get('versions').length;
      data.fileIcon = this.fileIcon(this.model.get('fileName'), latestVersion);

      var versions = this.model.get('versions');
      data.useSpinner = versions.at(versions.length - 1).get('thumbnailStatus') === 'GENERATING';
      return data;
    },

    rerender: function() {
      var el = this.render().el;
      //this.$el.replaceWith();
    },

    beforeClose: function() {
    },

    onPreviewLinkClick: function(e) {
      var self = this;
      var currentModel = self.model;

      var navigationController = {
        hasNext: function() {
          var i = self.parentCollection.indexOf(currentModel);
          return i < self.parentCollection.length - 1;
        },

        getNext: function() {
          var i = self.parentCollection.indexOf(currentModel);
          if(i < self.parentCollection.length - 1) {
            currentModel = self.parentCollection.at(i + 1);
            return currentModel;
          }
          return null;
        },

        hasPrevious: function() {
          var i = self.parentCollection.indexOf(currentModel);
          return i > 0;
        },

        getPrevious: function() {
          var i = self.parentCollection.indexOf(currentModel);
          if(i > 0) {
            currentModel = self.parentCollection.at(i - 1);
            return currentModel;
          }
          return null;
        }
      };

      var view = new FilePreviewView({ model: currentModel, navigationController: navigationController });
      var modal = new TroupeViews.Modal({ view: view, className: 'modal trpFilePreview', menuItems: [
      {
        id: "download",
        text: "Download"
      }
      ]});
      modal.show();

      return false;
    },

    onDeleteLinkClick: function(e) {
      //TODO(AN): replace window.confirm with a nice dialog!
      if(window.confirm("Delete " + this.model.get('fileName') + "?")) {
        this.model.destroy({
          success: function(model, response) {
          }
        });
      }

      return false;
    },

    onVersionsLinkClick: function(e) {
      var view = new FileVersionsView({ model: this.model });
      var modal = new TroupeViews.Modal({ view: view  });
      modal.show();

      return false;
    },

    showFileActionMenu: function(e) {
      $('body, html').on('click', this.hideFileActionMenu);
      this.$el.find(".trpFileActionMenu").fadeIn('fast');
      this.$el.find(".trpFileActionMenuTop").show();
      this.$el.find('.trpFileActionMenuBottom').slideDown('fast', function() {
          // Animation complete.
      });
      return false;
    },

    hideFileActionMenu: function(e) {
      var self = this;
      $('body, html').off('click', this.hideFileActionMenu);
      this.$el.find('.trpFileActionMenu').fadeOut('fast', function() {
        self.$el.find(".trpFileActionMenu").hide();
      });
    },

    fileIcon: function(fileName,version) {
      return '/troupes/' + window.troupeContext.troupe.id + '/thumbnails/' + fileName + "?version=" + version;
    }
  });
  */

});
