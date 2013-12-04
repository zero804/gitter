/* jshint unused:true, browser:true,  strict:true */
/* global define:false */
define([
  'oEmbed'
], function(oEmbed) {

  "use strict";

  function embed(chatItemView) {
    oEmbed.defaults.maxwidth = 370;
    chatItemView.$el.find('a.link').each(function(index, el) {
      oEmbed.parse(el.href, function(embed) {
        if (embed) {
          $(el).append('<div class="embed">' + embed.html + '</div>');
        }
      });
    });
  }

  var decorator = {

    decorate: function(chatItemView) {
       embed(chatItemView);
    }

  };

  return decorator;

});
