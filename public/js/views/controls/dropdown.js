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
      'click a':  'click',
      'click':    'click'
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
    },
    click: function(e) {
      this.trigger('selected', this.model);
      e.preventDefault();
      e.stopPropagation();
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
        // Forward 'selected' events
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
      this.$el.find('li.active:not(.divider):visible').removeClass('active');
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
      var newActive = e.currentTarget;

      if(currentActive[0] === newActive) return;

      currentActive.removeClass('active');
      $(newActive).addClass('active');
    },
    keydown: function (e) {
      switch(e.keyCode) {
        case 13:
          this.selected();
          return;
        case 27:
          this.hide();
          break;
        case 38:
          this.selectPrev();
          break;
        case 40:
          this.selectNext();
          break;
        default:
          return;
      }

      e.preventDefault();
      e.stopPropagation();
    },
    selectPrev: function() {
      this._moveSelect(-1);
    },
    selectNext: function() {
      this._moveSelect(+1);
    },
    select: function() {
      var first = this.$el.find('li:not(.divider):visible.active').first();
      if(first.length) {
        first.trigger('click');
      } else {
        this._moveSelect(0);
        this.$el.find('li:not(.divider):visible.active').first().trigger('click');
      }
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
