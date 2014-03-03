/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

define([
  'jquery',
  'marionette',
  'collections/instances/troupes',
  'views/controls/combobox',
  'views/base',
  './parentSelectView',
  'hbs!./tmpl/createRoom',
  'hbs!./tmpl/ownerSelectItem'
], function($, Marionette, troupeCollections, Combobox, TroupeViews, ParentSelectView, template, ownerSelectItemTemplate) {
  "use strict";

  var View = Marionette.Layout.extend({
    template: template,
    ui: {
      autoJoin: "#auto-join",
      permPublic: "#permission-repo-public",
      permPrivate: "#permission-repo-private",
      permOrg: "#permission-org",
      permAll: "#permission-org, #permission-public, #permission-custom"
    },
    regions: {
      ownerSelect: '#owner-region',
    },
    events: {
      'click #room-name': 'showPrivateRepoPermissions',
      'click .gtrOwnerDD': 'hidePrivateRepoPermissions'
    },

    showOtherPermissions: function() {

    },

    hidePublicRepoPermissions: function() {
      var self = this;
      this.ui.permPublic.slideUp("fast", function() {
        self.ui.permAll.slideDown("fast", function() {
          self.showAutoJoin();
          $('#public').prop('checked',true);
        });
      });
    },

    showPublicRepoPermissions: function() {
      var self=this;
      self.hideAutoJoin();
      this.ui.permAll.slideUp("fast", function() {
        self.$el.find("#permission-repo-public").slideDown("fast", function() {
          $('#repo-public').prop('checked',true);
        });
      });
    },

    hidePrivateRepoPermissions: function() {
      var self=this;
      this.$el.find("#permission-repo-private").slideUp("fast", function() {
        self.ui.permAll.slideDown("fast", function() {
          self.showAutoJoin();
          $('#public').prop('checked',true);
        });
      });
    },

    showPrivateRepoPermissions: function() {
      var self=this;
      self.hideAutoJoin();
      this.ui.permAll.slideUp("fast", function() {
        self.ui.permPrivate.slideDown("fast", function() {
          $('#repo-private').prop('checked',true);
        });
      });
    },

    hideOrgPermissions: function() {
      this.ui.permOrg.slideUp("fast", function() {

      });
    },

    showOrgPermissions: function() {
      this.ui.permOrg.slideDown("fast", function() {

      });
    },

    showAutoJoin: function() {
      this.ui.autoJoin.removeClass('disabled');
    },

    hideAutoJoin: function() {
      this.ui.autoJoin.addClass('disabled');
    },

    onRender: function() {
      this.ownerSelect.show(new ParentSelectView({
        orgsCollection: troupeCollections.orgs,
        troupesCollection: troupeCollections.troupes
      }));

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
