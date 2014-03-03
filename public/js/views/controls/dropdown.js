/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'marionette',
  'hbs!./tmpl/dropdown',
  'hbs!./tmpl/dropdownItem',
  'typeahead'
], function(Marionette, template, itemTemplate) {
  "use strict";

  var RowView = Marionette.ItemView.extend({
    tagName: "li",
    template: itemTemplate,
    className: function() {
      if(this.model.get('divider')) {
        return "divider";
      }

      return "";
    }
  });

  return Marionette.CompositeView.extend({
    itemViewContainer: "ul",
    itemView: RowView,
    template: template,
    ui: {
      menu: 'ul'
    },
    show: function() {
      this.ui.menu.show('fast');
    },
    hide: function () {
      this.ui.menu.hide('fast');
    }
  });

});
