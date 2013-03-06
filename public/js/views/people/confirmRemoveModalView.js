/*jshint unused:true, browser:true */

// TODO: Confirmation after invite sent

define([
  'jquery',
  'underscore',
  'views/base',
  'hbs!./tmpl/confirmRemoveModalView'
], function($, _, TroupeViews, template) {

    return TroupeViews.Base.extend({
    template: template,

    initialize: function(options) {
      var thisModel = options.model;
      this.displayName = thisModel.get('displayName');
    },

    getRenderData: function() {
      return {
        displayName: this.displayName
      };
    },

    events: {
      "click #button-yes": "yesClicked",
      "click #button-no" : "noClicked"
    },

    yesClicked: function() {
      this.trigger('confirm.yes');
    },

    noClicked: function() {
      this.trigger('confirm.no');
    },

    afterRender: function(e) {

    }

  });

});
