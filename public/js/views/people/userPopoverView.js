/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'views/popover',
  'hbs!./tmpl/userPopoverView'
], function(Marionette, Popover, template) {
  "use strict";

  var UserView = Marionette.ItemView.extend({
    template: template,
    serializeData: function() {
      var data = this.model.toJSON();
      data.avatarUrl = data.avatarUrlMedium + "&s=200";
      return data;
    }
  });

  var UserPopoverView = Popover.extend({

    initialize: function(options) {
      Popover.prototype.initialize.apply(this, arguments);
      this.view = new UserView({ model: this.model, userCollection: options.userCollection });
    }
  });

  return UserPopoverView;
});
