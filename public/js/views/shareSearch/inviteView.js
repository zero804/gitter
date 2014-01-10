/*jshint strict:true, undef:true, unused:strict, browser:true *//* global define:false */

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

    initialize: function(options) {

    },

    getShareUrl: function() {
      return context.env('basePath') + context.getTroupe().url;
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

    createClipboard : function() {
      if(this.clip) return;

      ZeroClipboard.setMoviePath( cdn('repo/zeroclipboard/ZeroClipboard.swf') );
      ZeroClipboard.Client.prototype.zIndex = 100000;
      var clip = new ZeroClipboard.Client();
      clip.setText(this.getShareUrl());
      clip.glue( 'copy-button');
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
      // if (context.getTroupe().githubType)

      return {
        hasFlash: this.detectFlash(),
        isRepo : isRepo,
        isOrg : isOrg,
        url: this.getShareUrl()
      };
    },

    events: {
      'mouseover #copy-button' :      'createClipboard'
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
    }
  });

  return {
    View: View,
    Modal: Modal
  };

});
