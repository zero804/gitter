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

    createClipboard : function() {
      if(this.clip) return;

      ZeroClipboard.setMoviePath( cdn('/repo/zeroclipboard/ZeroClipboard.swf') );
      ZeroClipboard.Client.prototype.zIndex = 100000;
      var clip = new ZeroClipboard.Client();
      clip.setText(this.getShareUrl());
      clip.glue( 'copy-button');
      // make your own div with your own css property and not use clip.glue()
      // var flash_movie = '<div>'+clip.getHTML(width, height)+'</div>';
      // var width = $("#copy-button").outerWidth()+4;
      // var height =  $("#copy-button").height()+10;
      // flash_movie = $(flash_movie).css({
      //     position: 'relative',
      //     marginBottom: -height,
      //     width: width,
      //     height: height,
      //     zIndex: 101
      //     });
      // $("#copy-button").before(flash_movie);
      this.clip=clip;
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
