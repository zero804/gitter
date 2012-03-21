// Filename: views/home/main
define([
  'jquery',
  'underscore',
  'backbone',
  'mustache',
  'text!templates/showMail/email.mustache',
], function($, _, Backbone, Mustache, template, rowTemplate) {
  var FullMailView = Backbone.View.extend({    
    tagName: "div",
    className: "modal hide fade",
    
    modified: false,
    
    events: {
      "click .closeButton":     "closeDialog"
    },
    
    initialize: function(options) {
     this.router = options.router;
    },
    
    show: function(id) {
      var r = this.render();
      var el = r.el;
      alert(id);
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
      var compiledTemplate = Mustache.render(template, {
        uri: window.troupeContext.troupe.uri
      });
      $(this.el).html(compiledTemplate);
      //$("form", this.el).append($(rowTemplate));
      
      return this;
    },
    
    closeDialog: function() {
      if(this.modified) {
        if(window.confirm("Are you sure?")) {
          this.$el.modal('hide');
        }
      } else {
        this.$el.modal('hide');
      }
    }
    
    
  });

  return FullMailView;
});
