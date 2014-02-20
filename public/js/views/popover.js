/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'underscore',
  './base',
  'utils/mutant',
  'hbs!./tmpl/popover',
], function( $, _, TroupeViews, Mutant, popoverTemplate) {
  "use strict";

  var Popover = TroupeViews.Base.extend({
    template: popoverTemplate,
    className: "popover",
    options: {
      animation: true,
      selector: false,
      title: '',
      footerView: null,
      delay: 300,
      container: false,
      placement: 'right',
      scroller: null,
      width: '',
      minHeight: ''
    },
    initialize: function(options) {
      _.bindAll(this, 'leave', 'enter');
      _.extend(this.options, options);
      //this.init('popover', element, options);
      this.view = this.options.view;

      if(this.options.scroller) {
        this.$scroller = $(this.options.scroller);
        this.scroller = this.$scroller[0];
      }

      this.targetElement = this.options.targetElement;
      this.$targetElement = $(this.targetElement);

      this.$targetElement.on('mouseenter', this.enter);
      this.$targetElement.on('mouseleave', this.leave);

      this.addCleanup(function() {
        if(this.mutant) this.mutant.disconnect();
      });
    },

    getRenderData: function() {
      return this.options;
    },

    afterRender: function() {
      var $e = this.$el;

      if(this.options.titleView) {
        $e.find('.popover-title').append(this.options.titleView.render().el);
      } else {
        $e.find('.popover-title').text(this.options.title);
      }

      $e.find('.popover-content').append(this.view.render().el);
      $e.find('.popover-inner').css('width', this.options.width).css('min-height', this.options.minHeight);

      var fv = this.options.footerView;

      if(fv) {
        $e.find('.popover-footer-content').append(fv.render().el);
      }

      $e.on('mouseenter', this.enter);
      $e.on('mouseleave', this.leave);

      $e.addClass('popover-hidden');
      $e.removeClass('fade top bottom left right in');
    },

    enter: function () {
      if (this.timeout) clearTimeout(this.timeout);
    },

    leave: function () {
      if (!this.options.delay) {
        return self.hide();
      }

      var self = this;
      this.timeout = setTimeout(function() {
        self.hide();
      }, self.options.delay);
    },

    onClose: function() {
      this.$el.off('mouseenter', this.enter);
      this.$el.off('mouseleave', this.leave);

      this.$targetElement.off('mouseenter', this.enter);
      this.$targetElement.off('mouseleave', this.leave);

      this.view.close();
    },

    show: function () {
      var $e = this.render().$el;
      var e = this.el;

      $e.detach().css({ top: 0, left: 0, display: 'block' });
      $e.insertAfter($('body'));
      this.reposition();

      $e.removeClass('popover-hidden');

      this.mutant = new Mutant(e);
      this.listenTo(this.mutant, 'mutation.throttled', this.reposition);
    },

    reposition: function() {
      try {
        var $e = this.$el;
        var e = this.el;
        var pos = this.getPosition();

        var actualWidth = e.offsetWidth;
        var actualHeight = e.offsetHeight;

        var placement = this.options.placement;
        switch (placement) {
          case 'vertical':
            placement = this.selectBestVerticalPlacement($e, this.targetElement);
            break;
         case 'horizontal':
            placement = this.selectBestHorizontalPlacement($e, this.targetElement);
            break;
        }

        var tp;
        switch (placement) {
          case 'bottom':
            tp = {top: pos.top + pos.height, left: pos.left + pos.width / 2 - actualWidth / 2};
            break;
          case 'top':
            tp = {top: pos.top - actualHeight, left: pos.left + pos.width / 2 - actualWidth / 2 - 2};
            break;
          case 'left':
            tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left - actualWidth};
            break;
          case 'right':
            tp = {top: pos.top + pos.height / 2 - actualHeight / 2, left: pos.left + pos.width};
            break;
        }

        this.applyPlacement(tp, placement);
      } finally {
        // This is very important. If you leave it out, Chrome will likely crash.
        if(this.mutant) this.mutant.takeRecords();
      }
    },

    selectBestVerticalPlacement: function(div, target) {
      var $target = $(target);

      if(this.scroller) {
        var scrollTop = this.scroller.scrollTop;
        var scrollBottom = this.scroller.scrollTop + this.scroller.clientHeight;
        var middle = (scrollTop + scrollBottom) / 2;
        if(target.offsetTop > middle) {
          return 'top';
        } else {
          return 'bottom';
        }
      }

      var panel = $target.offsetParent();
      if(!panel) return 'bottom';
      if($target.offset().top + div.height() + 20 >= panel[0].clientHeight) {
        return 'top';
      }

      return 'bottom';
    },

    selectBestHorizontalPlacement: function(div, target) {
      var $target = $(target);

      var panel = $target.offsetParent();
      if(!panel) return 'right';

      if($target.offset().left + div.width() + 20 >= panel[0].clientWidth) {
        return 'left';
      }

      return 'right';
    },

    applyPlacement: function(offset, placement){
      var $e = this.$el;
      var e = $e[0];

      var width = e.offsetWidth;
      var height = e.offsetHeight;
      var actualWidth;
      var actualHeight;
      var delta = 0;
      var replace;


      /* Adjust */
      if (placement == 'bottom' || placement == 'top') {
        if (offset.left < 0) {
          delta = offset.left * -2;
          offset.left = 0;
        }
      } else {
        if (offset.top < 0) {
          delta = offset.top * -2;
          offset.top = 0;
        } else {
          var clientHeight = this.scroller ? this.scroller.clientHeight : window.innerHeight;
            if(offset.top + height > clientHeight) {
            delta = 2 * (clientHeight - offset.top - height - 10);
            offset.top = clientHeight - height - 10;
          }
        }
      }

      $e
        .css({ top: offset.top, left: offset.left })
        .addClass(placement)
        .addClass('in');

      actualWidth = e.offsetWidth;
      actualHeight = e.offsetHeight;

      if (placement == 'top' && actualHeight != height) {
        offset.top = offset.top + height - actualHeight;
        replace = true;
      }

      if (placement == 'bottom' || placement == 'top') {
        this.replaceArrow(delta - width + actualWidth, actualWidth, 'left');
      } else {
        this.replaceArrow(delta - height + actualHeight, actualHeight, 'top');
      }
      if (replace) $e.offset(offset);
    },

    replaceArrow: function(delta, dimension, position){
      this
        .arrow()
        .css(position, delta ? (50 * (1 - delta / dimension) + "%") : '');
    },

    hide: function () {
      if (this.timeout) clearTimeout(this.timeout);

      var $e = this.$el;

      $e.removeClass('in');

      $e.addClass('popover-hidden');
      setTimeout(function() {
        $e.detach();
      }, 350);

      $e.trigger('hidden');
      this.trigger('hide');
      this.close();

      return this;
    },

    getPosition: function () {
      var el = this.targetElement;

      var pos = _.extend({}, el.getBoundingClientRect(), this.$targetElement.offset());

      return pos;
    },

    getTitle: function () {
      return this.options.title;
    },

    arrow: function(){
      if(!this.$arrow) {
        this.$arrow = this.$el.find(".arrow");
      }

      return this.$arrow;
    }
  });


  return Popover;
});
