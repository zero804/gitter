define([
  'jquery',
  'views/base',
  'hbs!./tmpl/inviteAvatar',
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

      // this.listenTo(this.model, 'change', this.avatarChange);
      // this.addCleanup(function() {
      //   self.stopListening();
      // });
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

      if (!this.model.get('oneToOneInvite')) {
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

    afterRender: function() {
      this.$el.find('.avatar-s').first().tooltip({
        html : true,
        placement : 'vertical',
        container: "body"
      });

    }

  });

});
