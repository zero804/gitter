
define([
  'jquery',
  'underscore',
  'utils/context',
  'views/base',
  'utils/cdn',
  'hbs!./tmpl/inviteView',
  'zeroclipboard'
], function($, _, context, TroupeViews, cdn, template, ZeroClipboard) {
  "use strict";

  var View = TroupeViews.Base.extend({
    template: template,

    initialize: function() {
      this.listenTo(this, 'menuItemClicked', this.menuItemClicked);
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
      if (navigator.plugins != null && navigator.plugins.length > 0){
              return navigator.plugins["Shockwave Flash"] && true;
          }
          if(~navigator.appVersion.indexOf("MSIE") && !~navigator.userAgent.indexOf("Opera")){
              try{
                  return new ActiveXObject("ShockwaveFlash.ShockwaveFlash") && true;
              } catch(e){}
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

    getRenderData: function() {
      var isOrg = false;
      var isRepo = false;

      if (context.getTroupe().githubType == 'REPO') {
        isRepo = true;
      }

      if (context.getTroupe().githubType == 'ORG') {
        isOrg = true;
      }

      var badgeUrl = this.getBadgeUrl(); // to get a badge with a room just pass in context.getTroupe().uri
      var shareUrl = this.getShareUrl({
          roomUrl: context.getTroupe().uri,
          qs: '?utm_source=badge&utm_medium=badge&utm_campaign=share-badge'
        });

      return {
        hasFlash: this.detectFlash(),
        isRepo : isRepo,
        isOrg : isOrg,
        url: shareUrl,
        badgeUrl: badgeUrl,
        badgeMD: this.getBadgeMD({
          alt: 'Gitter',
          badgeUrl: badgeUrl,
          shareUrl: shareUrl
        })
      };
    },

    events: {
      'mouseover .copy-button' :      'createClipboard'
    },

    afterRender: function() {

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
