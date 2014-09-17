
define([
  'jquery',
  'marionette',
  'utils/context',
  'views/base',
  'utils/cdn',
  'hbs!./tmpl/inviteView',
  'zeroclipboard'
], function($, Marionette, context, TroupeViews, cdn, template, ZeroClipboard) {
  "use strict";

  var View = Marionette.ItemView.extend({
    template: template,

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
    },

    events: {
      'mouseover .copy-button' : 'createClipboard',
      'click .js-badge': 'createBadge'
    },

    menuItemClicked: function(button) {
      switch(button) {
        case 'add':
          this.dialog.hide();
          window.location.hash = "#add";
          break;

        case 'cancel':
          this.dialog.hide();
          break;
      }
    },

    // composes a share url based on a room url and a qs
    getShareUrl: function (opts) {
      opts = opts || {};
      var roomUrl = (typeof opts.roomUrl !== 'undefined') ? opts.roomUrl : 'gitterHQ/gitter';
      var qs = (typeof opts.qs !== 'undefined') ? opts.qs : '';
      return context.env('basePath') + '/' + roomUrl + qs;
    },

    // gets the badge url, please pass in the room URI (not url)
    getBadgeUrl: function (content) {
      content = (typeof content !== 'undefined') ? content : 'JOIN ROOM';
      return context.env('badgeBaseUrl') + '/' + content + '.svg';
    },

    getBadgeMD: function (opts) {
      opts = opts || {};
      var alt = (typeof opts.alt !== 'undefined') ? opts.alt : 'Gitter';
      var badgeUrl = (typeof opts.badgeUrl !== 'undefined') ? opts.badgeUrl : this.getBadgeUrl();
      var shareUrl = (typeof opts.shareUrl !== 'undefined') ? opts.shareUrl : this.getShareUrl();
      return "[![" + alt + "](" + badgeUrl + ")](" + shareUrl + ")";
    },

    detectFlash: function() {
      if (navigator.plugins && navigator.plugins["Shockwave Flash"]) {
        return true;
      }

      if(~navigator.appVersion.indexOf("MSIE") && !~navigator.userAgent.indexOf("Opera")){
        try{
          new window.ActiveXObject("ShockwaveFlash.ShockwaveFlash");
          return true;
        } catch(e) {
          // Ignore the failure
        }
      }

      return false;
    },

    createClipboard : function(ev) {
      if(this.clip) return;

      ZeroClipboard.setMoviePath( cdn('repo/zeroclipboard/ZeroClipboard.swf') );
      ZeroClipboard.Client.prototype.zIndex = 100000;
      var clip = new ZeroClipboard.Client();
      clip.setText($(ev.target).data('copy-text'));
      clip.glue(ev.target);
      this.clip=clip;

      clip.addEventListener( 'onComplete', function() {
        $('.close').click();
      });
    },

    serializeData: function() {
      var room = context.getTroupe();
      var isPublicRepo = (room.githubType === 'REPO' && room.security === 'PUBLIC');

      var badgeUrl = this.getBadgeUrl(); // to get a badge with a room just pass in context.getTroupe().uri
      var shareUrl = this.getShareUrl({
          roomUrl: context.getTroupe().uri,
          qs: '?utm_source=badge&utm_medium=badge&utm_campaign=share-badge'
        });

      return {
        isPublicRepo: isPublicRepo,
        hasFlash: this.detectFlash(),
        url: shareUrl,
        badgeUrl: badgeUrl,
        badgeMD: this.getBadgeMD({
          alt: 'Gitter',
          badgeUrl: badgeUrl,
          shareUrl: shareUrl
        })
      };
    },


    createBadge: function() {
      var btn = this.$el.find('.js-badge')[0];
      var st = this.$el.find('.pr-status');
      st.html('Hold on...');
      btn.disabled = true;

      $.ajax({
        url: '/api/private/create-badge',
        contentType: "application/json",
        dataType: "json",
        type: "POST",
        data: JSON.stringify({
          uri: context.troupe().get('uri')
        }),
        context: this,
        timeout: 45 * 1000,
        error: function() {
          st.html('Oops, something went wront. Try again. (Is there a README.md in your project?)');
          btn.disabled = false;
        },
        success: function (res) {
          st.html('We just created a PR for you! <a href=' + res.html_url + ' target="_blank">Review and merge &rarr;</a>');
        }
      });
    },


  });

  var Modal = TroupeViews.Modal.extend({
    initialize: function(options) {
      options = options || {};
      options.title = options.title || "Share this chat room";

      TroupeViews.Modal.prototype.initialize.call(this, options);
      this.view = new View(options);
    },
    menuItems: [
      { action: "cancel", text: "Close", className: "trpBtnLightGrey" },
      { action: "add", text: "Add people", className: "trpBtnBlue trpBtnRight"}
    ]
  });

  return {
    View: View,
    Modal: Modal
  };

});
