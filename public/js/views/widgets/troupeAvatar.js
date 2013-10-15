/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'hbs!./tmpl/troupeAvatar',
  'bootstrap_tooltip'
], function($, TroupeViews, template) {

  "use strict";

  /** @const */
  var RING_COLOURS = ['#1abc9c', '#2ecc71', '#9b59b6', '#3498db', '#e74c3c', '#f1c40f',
            '#d35400', '#c0392b', '#f39c12', '#e67e22', '#16a085' ,'#2980b9', '#95a5a6' ];

  return TroupeViews.Base.extend({
    tagName: 'div',
    template: template,
    initialize: function(options) {
      // var self = this;
      if(!this.model) this.model = options.troupe;
      
      if(!options.noUnread) {
        this.hasUnread = false;
        this.listenTo(this.model, 'change:name', this.change);
        this.listenTo(this.model, 'change:unreadItems', this.unreadItemsChanged);
      }
      if (options.noHref) {
        this.noHref = options.noHref;
      }
    },


    getRenderData:function () {

      function hash(troupeId) {
        if(!troupeId) return 0;
        var result = 0;
        for(var i = 0; i < troupeId.length; i++) {
          result += troupeId.charCodeAt(i);
        }

        return result;
      }

      var data = this.model.toJSON();
      data.noHref = this.noHref;
      if (!this.model.get('oneToOne')) {
        var initials = this.model.get('name')
                            .split(/[^\w]/)
                            .filter(function(f) { return f; })
                            .map(function(s) { return s.charAt(0); })
                            .slice(0,2)
                            .join('')
                            .toUpperCase();

        var colour = RING_COLOURS[hash(this.model.id) % RING_COLOURS.length];

        data.initials = initials;
        data.colour = colour;
      }
      return data;
    },

    unreadItemsChanged: function() {
      var newUnread = this.model.get('unreadItems') > 0;
      if(this.hasUnread !== newUnread) {
        this.hasUnread = newUnread;
        var $e = this.$el.find('.trpDisplayPicture');

        if(newUnread) {
          $e.addClass('unread');
        } else {
          $e.removeClass('unread');
        }
      }
    },

    change: function() {
      this.rerender();
    },

    afterRender: function() {
      this.unreadItemsChanged();

      this.$el.find('.avatar-s').first().tooltip({
        html : true,
        placement : 'vertical',
        container: "body"
      });
    }

  });

});
