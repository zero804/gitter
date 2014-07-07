define([
  'jquery',
  'underscore',
  'marionette',
  'views/base',
  'cocktail',
  'mutant',
  './selectable-mixin',
  'hbs!./tmpl/dropdownItem',
  'utils/dataset-shim'
], function($, _, Marionette, TroupeViews, cocktail, Mutant, SelectableMixin, itemTemplate, dataset) {
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

  var DropdownItemView = Marionette.ItemView.extend({
    tagName: "li",
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
    onRender: function() {
      dataset.set(this.el, 'cid', this.model.cid);
    }
  });

  var activeDropdown = null;

  var DEFAULTS = {
    placement: 'left'
  };

  var DropdownMenuView = Marionette.CollectionView.extend({
    itemView: DropdownItemView,
    tagName: 'ul',
    className: 'dropdown dropdown-hidden selectable',
    ui: {
      menu: 'ul.dropdown'
    },
    events: {
      'keydown': 'keydown',
      'click li a': 'clicked'
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

      /* From the selectable-mixin */
      this.listenTo(this, 'selectClicked', function() {
        this.hide();
      });

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
        activeDropdown.hide();
      }

      activeDropdown = this;

      var zIndex = parseInt(this.el.style.zIndex, 10);
      $('<div class="dropdown-backdrop"/>').css({ zIndex: zIndex - 1 }).insertAfter($('body')).on('click', function() {
        $(backdrop).remove();
        if(activeDropdown) {
          var t = activeDropdown;
          activeDropdown = null;
          t.hide();
        }
      });

      this.setActive(this.selectedModel);


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
      // $el.find('li.active:not(.divider):visible').removeClass('active');
      $el.addClass('dropdown-hidden');
      $(backdrop).remove();

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

    keydown: function (e) {
      switch(e.keyCode) {
        case 13:
          this.selected();
          return;
        case 27:
          this.hide();
          break;
        default:
          return;
      }

      e.preventDefault();
      e.stopPropagation();
    }
  });
  cocktail.mixin(DropdownMenuView, TroupeViews.SortableMarionetteView, SelectableMixin);
  return DropdownMenuView;
});
