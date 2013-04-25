/*jshint unused:true, browser:true */
define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/shareRow',
  'jquery-placeholder', // No reference
  'jquery-validate'  // No reference
], function($, _, TroupeViews, rowTemplate) {
  "use strict";

  return TroupeViews.Base.extend({

    events: {
      "click .addrow": "onAddRow"
    },

    initialize: function(options) {
      var data = (options && options.invitations) ? options.invitations : [];
      // will add initial invitation fields passed in to constructor
      for (var i = 0; i < data.length; i++) {
        this.addRow(data[i]);
      }
      // add at least one blank row
      if (!data.length)
        this.addRow();
    },

    // creates but does not add a row template evaluation
    createRow: function(data) {
      if (!data) data = {};

      // generate an invitation row markup
      var $rowEl = $(rowTemplate(data));

      $rowEl.find('[name=displayName]').placeholder().val(data.displayName);
      $rowEl.find('[name=inviteEmail]').placeholder().val(data.inviteEmail);

      return $rowEl;
    },

    addRow: function(data) {
      this.$el.append(this.createRow(data));
    },

    // accepts an event parameter unlike addRow
    onAddRow: function(/* event */) {
      this.addRow();
    },

    getValidationConfig: function () {
      return {
        rules: {
          //displayName: "required",
          inviteEmail: {
            //required: true,
            email: true
          }
        },
        debug: true,
        messages: {
          //displayName: {
          //  required: "Please tell us your friend's name. "
          //},
          inviteEmail : {
            //required: "We need to know your friend's email address to send an invite.",
            email: "Hmmm, that doesn't look like an email address."
          }
        }
      };
    },

    serialize: function() {
      var invites = [];
      var controlGroups = this.$el.find(".control-group");
      for(var i = 0; i < controlGroups.length; i++) {
        var cg = controlGroups[i];
        var displayName = $(".f-name", cg).val();
        var email = $(".f-email", cg).val();
        invites.push({
          displayName: displayName,
          email: email
        });
      }

      return invites;
    }

  });

});