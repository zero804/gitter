/*jshint unused:true browser:true*/
// Filename: views/home/main
// TODO: Fix showing invites

define([
  'jquery',
  'underscore',
  'backbone',
  'views/base',
  'hbs!./tmpl/people',
  'views/confirmDialog',
  'views/share/shareModalView',
  './userTabView',
  './requestTabView',
  './inviteTabView'
], function($, _, Backbone, TroupeViews, template, ConfirmDialog, ShareModalView, UserTabView, RequestTabView, InviteTabView) {
  "use strict";

  return TroupeViews.Base.extend({
    template: template,

    events: {
      "click #share-button" : "showShareView"
    },

    attributes: {

    },

    initialize: function(options) {
      if(options && options.params) {
        this.initialTab = options.params.tab;
      }
    },

    afterRender:function() {
      var self = this;
      this.$el.find('#requests').html(new RequestTabView().render().el);
      this.$el.find('#users').html(new UserTabView().render().el);
      this.$el.find('#invites').html(new InviteTabView().render().el);

      if(this.initialTab) {
        $("#tab-people-" + this.initialTab, this.el).tab('show');
        this.onTabSelected(this.initialTab);
      } else {

      }

      $('a[data-toggle="tab"]', this.el).on('shown', function (e) {

      });
    },

    // getRenderData: function() {
    //   return {};
    // },

    showShareView: function() {
      var view = new ShareModalView({ model: this.model, uri: window.troupeContext.troupe.uri });
      var modal = new TroupeViews.Modal({ view: view  });

      view.on('share.complete', function(data) {
          modal.off('share.complete');
          modal.hide();
        });

      modal.show();

      return false;
    }

  });

});
