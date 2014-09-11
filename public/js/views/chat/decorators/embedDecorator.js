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
        isCollapsible = true;
        if (el.childElementCount === 0 && (el.innerText || el.textContent) === el.href) {
          oEmbed.parse(el.href, function (embed) {
            if (embed && embed.html) {
              var $embed = $(document.createElement('div'));
              $embed.addClass('embed');
              if(chatItemView.expandFunction) {
                chatItemView.expandFunction($embed);
              }

              if (embed.limitHeight) {
                $embed.addClass('embed-limited');
              }

              $embed.html(embed.html);
              $(el).after($embed);

              // any iframely iframes will resize once content loads
              $.iframely.registerIframesIn(chatItemView.$el);
            }
          });
        }
      });

    model.set('isCollapsible', isCollapsible);
  }

  var decorator = {

    decorate: function(chatItemView) {
       embed(chatItemView);
    }
  };

  return decorator;
});
