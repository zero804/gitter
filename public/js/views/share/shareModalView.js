// Filename: views/home/main
// TODO: Confirmation after invite sent

console.log("opened shareModalView");

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./shareModalView',
  'hbs!./share-row'
], function($, _, TroupeViews, template, rowTemplate) {

    console.log("Start of shareModalView");

    return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      // _.bindAll(this, 'onFormSubmit');
      // this.uri = options.uri;
    },

    getRenderData: function() {
      return {
        // uri: this.uri
      };
    },

    events: {
      "click .addrow": "addRow",
      "submit form": "onFormSubmit"
    },

    addRow: function(event) {
      var target = $(event.target);
      var rowDiv = target.parent().parent();
      target.remove();
      $(rowTemplate({})).insertAfter(rowDiv);
    },

    afterRender: function(e) {
      // $("form", this.el).prepend($(rowTemplate({})));
    },

    onFormSubmit: function(e) {
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

      if(e) e.preventDefault();
      var form = this.$el.find('form');
      var that = this;

      $.ajax({
        url: "/troupes/" + window.troupeContext.troupe.id + "/invites",
        contentType: "application/json",
        dataType: "json",
        data: JSON.stringify(invites),
        type: "POST",
        success: function(data) {
           if(data.failed) {
            alert('Oopsie daisy')
            return;
          }
          that.trigger('share.complete', data);

        }
      });
    }
  });

});