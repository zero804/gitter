// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/share/share.mustache',
  'text!templates/share/share-row.mustache',
], function($, _, Backbone, Mustache, template, rowTemplate) {
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
      
      this.$el.modal('show');
    },
    
    render: function() {
      var compiledTemplate = Mustache.render(template, { 
        uri: window.troupeContext.troupe.uri
      });
      $(this.el).html(compiledTemplate);
      $("form", this.el).append($(rowTemplate));
      return this;
    },
    
    addRow: function(event) {
      var target = $(event.target);
      var rowDiv = target.parent();
      target.remove();
      $(rowTemplate).insertAfter(rowDiv);
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
        var name = $(".f-name", cg).val();
        var email = $(".f-email", cg).val();
        invites.push({
          name: name,
          email: email
        });
      }
      
      $.post(
        "/troupes/" + window.troupeContext.troupe.id + "/shares",
        JSON.stringify(invites),
        function(data) {
          window.alert("fuckit");
        },
        "json")
        .error(function() { window.alert("fucked")})
      
      
      return false;
    }
    
    
  });

  return ShareView;
});
