/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'jquery-iframely',
  'oEmbed',
], function($, oEmbed) {

  "use strict";

  function embed(chatItemView) {
    chatItemView.$el.find('a.link').each(function(index, el) {
      if(el.childElementCount === 0 && el.innerText === el.href) {
        oEmbed.parse(el.href, function(embed) {
          if (embed && embed.html) {
            $(el).after('<div class="embed">' + embed.html + '</div>');

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
