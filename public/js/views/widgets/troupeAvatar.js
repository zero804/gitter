/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */
define([
  'jquery',
  'views/base',
  'hbs!./tmpl/troupeAvatar',
  'bootstrap_tooltip'
], function($, TroupeViews, template) {

  "use strict";

  return TroupeViews.Base.extend({
    tagName: 'div',
    template: template,
    initialize: function(options) {
      // var self = this;
      if(!this.model) this.model = options.troupe;
      this.hasUnread = false;
      this.listenTo(this.model, 'change:unreadItems', this.unreadItemsChanged);
    },

    hash:function(troupeId) {
      if(!troupeId) return 0;
      var result = 0;
      for(var i = 0; i < troupeId.length; i++) {
        result += troupeId.charCodeAt(i);
      }

      return result;
    },


    getRenderData:function () {
      var that = this;
      if (!this.model.attributes.oneToOne) {
        var initials = this.model.attributes.name
                            .split(/[^\w]/)
                            .filter(function(f) { return f; })
                            .map(function(s) { return s.charAt(0); })
                            .slice(0,2)
                            .join('')
                            .toUpperCase();
        var colours = ['#1abc9c', '#2ecc71', '#9b59b6', '#3498db', '#e67e22', '#e74c3c', '#f1c40f',
                  '#9b59b6', '#1abc9c'];
        var colour = colours[that.hash(this.model.attributes.id) % colours.length];
        return {
          oneToOne: this.model.attributes.oneToOne,
          initials: initials,
          colour: colour
        };
      } else {
        return {
          avatarUrl: this.model.attributes.avatarUrl || "",
          oneToOne: this.model.attributes.oneToOne
        };
      }
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

    afterRender: function() {
      this.unreadItemsChanged();
      this.$el.find(':first-child').tooltip({
        html : true,
        placement : function(a, element) {
          var position = $(element).position();
          if (position.top < 110){
            return "bottom";
          }

          return "top";
        },
        container: "body"
      });
    }

  });

});
