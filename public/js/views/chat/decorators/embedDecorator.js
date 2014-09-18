/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'jquery-iframely',
  'oEmbed',
], function($, oEmbed) {

  "use strict";

  function embed(chatItemView) {
    var model = chatItemView.model;

    if (model.get('collapsed')) {
      model.set('isCollapsible', true); // NOTE: this is super important because it avoids the images getting embedded
      return;
    }

    var isCollapsible = false;
    chatItemView.$el
      .find('a.link')
      .each(function (index, el) {
        if (el.childElementCount === 0 && (el.innerText || el.textContent) === el.href) {
          oEmbed.parse(el.href, function (embed) {
            if (embed && embed.html) {

              if(!isCollapsible) {
                model.set('isCollapsible', true);
                isCollapsible = true;
              }

              var $embed = $(document.createElement('div'));
              $embed.addClass('embed');
              if(chatItemView.expandFunction) {
                chatItemView.expandFunction($embed);
              }

              if (embed.limitHeight) {
                $embed.addClass('embed-limited');
              }

              var _iframe = embed.html;
              var iframewidth   = _iframe.match(/width="(\d+)"/);
              var iframeheight  = _iframe.match(/height="(\d+)"/);

              if (iframewidth && iframewidth[1] > 640 || iframeheight && iframeheight[1] > 480) {
                _iframe = _iframe.replace(/width="\d+"/,'width="' + iframewidth[1]/2 + '"');
                _iframe = _iframe.replace(/height="\d+"/,'height="' + iframeheight[1]/2 + '"');
              }

              $embed.html(_iframe);
              $(el).after($embed);

              // any iframely iframes will resize once content loads
              $.iframely.registerIframesIn(chatItemView.$el);
            }
          });
        }
      });

  }

  var decorator = {

    decorate: function(chatItemView) {
       embed(chatItemView);
    }
  };

  return decorator;
});
