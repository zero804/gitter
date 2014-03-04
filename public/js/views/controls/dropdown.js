/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'marionette',
  'views/base',
  'cocktail',
  'hbs!./tmpl/dropdown',
  'hbs!./tmpl/dropdownItem',
  'hbs!./tmpl/dropdownEmpty'
], function($, Marionette, TroupeViews, cocktail, template, itemTemplate, emptyTemplate) {
  "use strict";

  var backdrop = '.dropdown-backdrop';
  // var toggle   = '[data-toggle=dropdown]';

  var EmptyView = Marionette.ItemView.extend({
    template: emptyTemplate
  });

  var RowView = Marionette.ItemView.extend({
    tagName: "li",
    events: {
      'click a': function(e) {
        this.trigger('selected', this.model);
        e.preventDefault();
      }
    },
    template: itemTemplate,
    initialize: function(options) {
      if(options && options.template) {
        this.template = options.template;
      }
    },
    className: function() {
      if(this.model.get('divider')) {
        return "divider";
      }

      return "";
    }
  });

  var activeDropdown = null;


  var View = Marionette.CompositeView.extend({
    itemViewContainer: "ul.dropdown-menu",
    itemView: RowView,
    emptyView: EmptyView,
    template: template,
    ui: {
      menu: 'ul.dropdown-menu'
    },
    events: {
      'keydown': 'keydown',
      'mouseover li:not(.divider):visible': 'mouseover'
    },
    className: 'dropdown',
    itemEvents: {
      'selected': function(e, target, model) {
        this.trigger('selected', model);
      }
    },
    itemViewOptions: function() {
      var options = {};
      if(this.options.itemTemplate) {
        options.template = this.options.itemTemplate;
      }
      return options;
    },
    active: function() {
      return this.$el.hasClass('open');
    },
    show: function() {
      if(this.active()) return;

      $(backdrop).remove();
      if(activeDropdown) {
        // var t = activeDropdown;
        // activeDropdown = null;
        activeDropdown.hide();
      }

      activeDropdown = this;

      $('<div class="dropdown-backdrop"/>').insertAfter(this.$el).on('click', function() {
        $(backdrop).remove();
        if(activeDropdown) {
          var t = activeDropdown;
          activeDropdown = null;
          t.hide();
        }
      });

      this.trigger('show.bs.dropdown');

      this.$el
        .addClass('open');

      this.trigger('shown.bs.dropdown');

      this.$el.focus();
    },
    hide: function() {
      if(!this.active()) return;
      this.$el.removeClass('open');
      activeDropdown = null;
    },
    toggle: function () {
      var isActive = this.active();
      if(isActive) {
        this.hide();
      } else {
        this.show();
      }
    },
    mouseover: function(e) {
      var $items = this.$el.find('li:not(.divider):visible');

      if (!$items.length) return;

      var currentActive = $items.filter('.active');
      var newActive = e.target;

      if(currentActive[0] === newActive) return;

      currentActive.removeClass('active');
      $(newActive).addClass('active');
    },
    keydown: function (e) {
      if (!/(38|40|27|13)/.test(e.keyCode)) return;

      e.preventDefault();
      e.stopPropagation();

      var $parent  = this.$el; //getParent($this);
      var isActive = $parent.hasClass('open');

      if (isActive && e.keyCode == 27) {
        // if (e.which == 27) $parent.find(toggle).focus();
        return this.hide();
      }

      if (e.keyCode == 38) this.selectPrev();
      if (e.keyCode == 40) this.selectNext();

    },
    selectPrev: function() {
      this._moveSelect(-1);
    },
    selectNext: function() {
      this._moveSelect(+1);
    },
    _moveSelect: function(delta) {
      var $items = this.$el.find('li:not(.divider):visible');

      if (!$items.length) return;

      var currentActive = $items.filter('.active');
      var index = $items.index(currentActive);
      if(!~index) {
        index = 0;
      } else {
        index = index + delta;
        if(index < 0) {
          index = 0;
        } else if(index >= $items.length) {
          index = $items.length - 1;
        }
      }

      if(index != currentActive) {
        var newActive = $items.eq(index);
        currentActive.removeClass('active');
        newActive.addClass('active');
        newActive.addClass('focus');
      }
    }
  });
  cocktail.mixin(View, TroupeViews.SortableMarionetteView);

  return View;
});
