/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'utils/cdn',
  'hbs!./tmpl/createRoom'
], function($, _, context, TroupeViews, cdn, template) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,
    events: {
      'click #room-name': 'showPrivateRepoPermissions',
      'click .gtrOwnerDD': 'hidePrivateRepoPermissions'
    },

    initialize: function(options) {

    },

    getRenderData: function() {
      return {

      };
    },


    showOtherPermissions: function() {

    },

    hidePublicRepoPermissions: function() {
      var self=this;
      this.$el.find("#permission-repo-public").slideUp("fast", function() {
        self.$el.find("#permission-org, #permission-public, #permission-custom").slideDown("fast", function() {
          self.showAutoJoin();
          $('#public').prop('checked',true);
        });
      });
    },

    showPublicRepoPermissions: function() {
      var self=this;
      self.hideAutoJoin();
      this.$el.find("#permission-org, #permission-public, #permission-custom").slideUp("fast", function() {
        self.$el.find("#permission-repo-public").slideDown("fast", function() {
          $('#repo-public').prop('checked',true);
        });
      });
    },

    hidePrivateRepoPermissions: function() {
      var self=this;
      this.$el.find("#permission-repo-private").slideUp("fast", function() {
        self.$el.find("#permission-org, #permission-public, #permission-custom").slideDown("fast", function() {
          self.showAutoJoin();
          $('#public').prop('checked',true);
        });
      });
    },

    showPrivateRepoPermissions: function() {
      var self=this;
      self.hideAutoJoin();
      this.$el.find("#permission-org, #permission-public, #permission-custom").slideUp("fast", function() {
        self.$el.find("#permission-repo-private").slideDown("fast", function() {
          $('#repo-private').prop('checked',true);
        });
      });
    },

    hideOrgPermissions: function() {
      this.$el.find("#permission-org").slideUp("fast", function() {

      });
    },

    showOrgPermissions: function() {
      this.$el.find("#permission-org").slideDown("fast", function() {

      });
    },

    showAutoJoin: function() {
      this.$el.find("#auto-join").removeClass('disabled');
    },

    hideAutoJoin: function() {
      this.$el.find("#auto-join").addClass('disabled');
    },

    afterRender: function() {
      var self = this;
      this.$el.find("input:radio").change(function () {
        if ($("#private").is(":checked")) {
          self.hideAutoJoin();
        } else {
          self.showAutoJoin();
        }
      });
    },


  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Create a chat room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
