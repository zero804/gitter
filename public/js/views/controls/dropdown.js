/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  'marionette',
  'views/base',
  'cocktail',
  'mutant',
  'hbs!./tmpl/dropdown',
  'hbs!./tmpl/dropdownItem',
  'hbs!./tmpl/dropdownEmpty'
], function($, _, Marionette, TroupeViews, cocktail, Mutant, template, itemTemplate, emptyTemplate) {
  "use strict";

  /* Transition period on css */
  var TRANSITION = 160;

  function findMaxZIndex(element) {
    var max = 0;
    while(element && element != document) {
      var style = window.getComputedStyle(element, null);

      if(style) {
        var zIndex = style.getPropertyValue('z-index');
        if(zIndex && zIndex !== "auto") {
          zIndex = parseInt(zIndex, 10);
          if(zIndex > max) {
            max = zIndex;
          }
        }
      }

      element = element.parentNode;
    }

    return max;
  }

  var backdrop = '.dropdown-backdrop';

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

  var DEFAULTS = {
    placement: 'left'
  };

  var DropdownMenuView = Marionette.CollectionView.extend({
    itemView: RowView,
    tagName: 'ul',
    className: 'dropdown dropdown-hidden',
    ui: {
      menu: 'ul.dropdown'
    },
    events: {
      'keydown': 'keydown',
      'mouseover li:not(.divider):visible': 'mouseover',
      'click li a': 'clicked'
    },
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
    initialize: function(options) {
      this.targetElement = options.targetElement;
      this.$targetElement = $(this.targetElement);
      this.options = _.extend({}, DEFAULTS, options);
    },
    active: function() {
      return !this.$el.hasClass('dropdown-hidden');
    },
    onRender: function() {
      var zIndex = findMaxZIndex(this.targetElement) + 5;
      if(zIndex < 100) {
        zIndex = 100;
      }
      this.el.style.zIndex = zIndex;
    },
    onClose: function() {
      if(this.mutant) this.mutant.disconnect();
    },
    clicked: function() {
      if(!this.collection) {
        /* Static */
        this.hide();
      }
    },
    getPosition: function () {
      var el = this.targetElement;

      var pos = _.extend({}, el.getBoundingClientRect(), this.$targetElement.offset());

      return pos;
    },

    hasItems: function() {
      if(this.collection) return this.collection.length > 0;

      // Static mode
      return true;
    },

    onAfterItemAdded: function() {
      setTimeout(function() {
        if(!this.active() && this.showWhenItems && this.hasItems()) {
          this.show();
        }
      }.bind(this), 10);
    },

    onItemRemoved: function() {
      setTimeout(function() {
        if(!this.hasItems()) {
          this.hide();
          this.showWhenItems = true;
        }
      }.bind(this), 10);
    },

    show: function () {
      if(this.active()) return;

      if(!this.hasItems()) {
        this.showWhenItems = true;
        return;
      }

      var $e = this.render().$el;
      var e = this.el;


      $(backdrop).remove();
      if(activeDropdown) {
        // var t = activeDropdown;
        // activeDropdown = null;
        activeDropdown.hide();
      }

      activeDropdown = this;

      var zIndex = parseInt(this.el.style.zIndex, 10);
      $('<div class="dropdown-backdrop"/>').css({ zIndex: zIndex - 1 }).insertAfter(this.$el).on('click', function() {
        $(backdrop).remove();
        if(activeDropdown) {
          var t = activeDropdown;
          activeDropdown = null;
          t.hide();
        }
      });


      $e.detach().css({ top: 0, left: 0, display: 'block' });
      $e.appendTo($('body'));
      this.reposition();

      $e.removeClass('dropdown-hidden');

      if(!this.mutant) {
        this.mutant = new Mutant(e, this.mutationReposition, { scope: this, timeout: 20 });
      }
    },

    hide: function() {
      var $el = this.$el;
      this.showWhenItems = false;
      if(!this.active()) return;
      $el.find('li.active:not(.divider):visible').removeClass('active');
      $el.addClass('dropdown-hidden');

      window.setTimeout(function() {
        $el.css({ display: 'none' });
      }, TRANSITION);
      activeDropdown = null;
    },

    mutationReposition: function() {
      try {
        if(!this.active()) return;
        this.reposition();
      } finally {
        // This is very important. If you leave it out, Chrome will likely crash.
        if(this.mutant) this.mutant.takeRecords();
      }
    },

    reposition: function() {
      var e = this.el;
      var pos = this.getPosition();

      var actualWidth = e.offsetWidth;

      var left;
      if(this.options.placement === 'left') {
        left = pos.left;
      } else {
        left = pos.left - actualWidth + pos.width;
      }

      console.log('LEFT IS ', left);
      console.log('POS IS ', pos);

      var tp = {top: pos.top + pos.height, left: left};
      this.applyPlacement(tp);
    },

    applyPlacement: function(offset){
      var $e = this.$el;
      var e = $e[0];

      var actualWidth;
      var actualHeight;
      var delta = 0;
      var replace;


      /* Adjust */
      if ('left' in offset && offset.left < 0) {
        delta = offset.left * -2;
        offset.left = 0;
      }

      $e
        .css(offset);

      actualWidth = e.offsetWidth;
      actualHeight = e.offsetHeight;
      if (replace) $e.offset(offset);
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
  cocktail.mixin(DropdownMenuView, TroupeViews.SortableMarionetteView);

  return DropdownMenuView;
});
