/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'jquery-iframely',
  'oEmbed',
], function($, oEmbed) {

  "use strict";
  var MAX_HEIGHT = 640;
  var MAX_WIDTH = 640;

  function adjustBounds($fragment) {
    var iframe;
    if(!$fragment.length) return;
    if($fragment[0].tagName === 'IFRAME') {
      iframe = $fragment;
    } else {
      iframe = $fragment.find('iframe');
      if(iframe.length === 0) return;
    }

    var height = iframe.attr('height') || 0;
    var width = iframe.attr('width') || 0;

    var scale;
    if(height > MAX_HEIGHT) {
      scale = MAX_HEIGHT / height;
      height = MAX_HEIGHT;
      width = width * scale;
    }

    if(width > MAX_WIDTH) {
      scale = MAX_WIDTH / width;
      width = MAX_WIDTH;
      height = height * scale;
    }

    if(height) {
      iframe.attr('height', Math.round(height));
    }

    if(width) {
      iframe.attr('width', Math.round(width));
    }
  }

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

              var embeddedContent = $($.parseHTML(embed.html, null, true));
              adjustBounds(embeddedContent);

              var $embed = $(document.createElement('div'));
              $embed.addClass('embed');
              if(chatItemView.expandFunction) {
                chatItemView.expandFunction($embed);
              }

              if (embed.limitHeight) {
                $embed.addClass('embed-limited');
              }

              $embed.html(embeddedContent);
              $(el).after($embed);

              // any iframely iframes will resize once content loads
              $.iframely.registerIframesIn($embed);
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
