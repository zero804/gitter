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
      'click #room-name': 'showOrgPermissions',
      'click .gtrOwnerDD': 'hideOrgPermissions'
    },

    initialize: function(options) {

    },

    getRenderData: function() {
      return {

      };
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

    hideOrgPermissions: function() {
      this.$el.find("#permission-org").slideUp("fast", function() {

      });
    },

    showOrgPermissions: function() {
      this.$el.find("#permission-org").slideDown("fast", function() {

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
