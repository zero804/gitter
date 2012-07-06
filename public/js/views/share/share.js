// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'hgn!templates/share/share',
  'hgn!templates/share/share-row'
], function($, _, Backbone, template, rowTemplate) {
  var ShareView = Backbone.View.extend({
    tagName: "div",
    className: "modal hide fade",

    modified: false,

    events: {
      "click .addrow":          "addRow",
      "click .closeButton":     "closeDialog",
      "keypress input":         "recordKeyPress",
      "click .sendInvites":    "submitForm"
    },

    initialize: function(options) {
     this.router = options.router;
    },

    show: function() {
      var r = this.render();
      var el = r.el;

      $('body').append(el);

      var self = this;
      this.$el.on('hidden', function () {
        self.remove();
      });

      this.$el.on('shown', function () {
        $("input.f-name", this.el).focus();
      });

      this.$el.modal('show');
    },

    render: function() {
      var compiledTemplate = template({
        uri: window.troupeContext.troupe.uri
      });
      $(this.el).html(compiledTemplate);
      $("form", this.el).append($(rowTemplate({})));

      return this;
    },

    addRow: function(event) {
      var target = $(event.target);
      var rowDiv = target.parent();
      target.remove();
      $(rowTemplate({})).insertAfter(rowDiv);
    },

    recordKeyPress: function() {
      this.modified = true;
    },

    closeDialog: function() {
      if(this.modified) {
        if(window.confirm("Are you sure?")) {
          this.$el.modal('hide');
        }
      } else {
        this.$el.modal('hide');
      }
    },

    submitForm: function() {
      var invites = [];

      var controlGroups = $("form .control-group", this.$el);
      for(var i = 0; i < controlGroups.length; i++) {
        var cg = controlGroups[i];
        var displayName = $(".f-name", cg).val();
        var email = $(".f-email", cg).val();
        invites.push({
          displayName: displayName,
          email: email
        });
      }

      var self = this;
      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
        contentType: "application/json",
        data: JSON.stringify(invites),
        dataType: "json",
        type: "POST",
        success: function(data) {
          self.$el.modal('hide');
        }
      });

      return false;
    }


  });

  return ShareView;
});
