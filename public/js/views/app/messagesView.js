/*jshint unused:strict, browser:true */
define([
  'views/base',
  'hbs!./tmpl/messages'
], function(TroupeViews, messagesTemplate) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: messagesTemplate,
    initialize: function(options) {
      this.messageName = options.messageName;
    },

    afterRender: function() {
      var msg = this.$el.find(this.messageName);
      msg.show();
    }
  });

  return TroupeViews.Modal.extend({

    initialize: function(options) {
      options.view = new View(options);
      TroupeViews.Modal.prototype.initialize.call(this, options);
    }

  });

});