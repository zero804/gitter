"use strict";

var $ = require('jquery-iframely');
var embedGenerator = require('../../../utils/embed-generator');

module.exports = (function() {

  function embed(chatItemView) {
    var model = chatItemView.model;

    if (model.get('collapsed')) {
      model.set('isCollapsible', true); // NOTE: this is super important because it avoids the images getting embedded
      return;
    }

    var isCollapsible = false;
    chatItemView.$el
      .find('a.link')
      .each(function (index, el) { // jshint unused:true
        if (el.childElementCount === 0 && (el.innerText || el.textContent) === el.href) {
          embedGenerator.parse(el.href, function (embed) {
            if (embed && embed.html) {

              if(!isCollapsible) {
                model.set('isCollapsible', true);
                isCollapsible = true;
              }

              var embeddedContent;
              if(typeof embed.html === 'string') {
                embeddedContent = $($.parseHTML(embed.html, null, true));
              } else {
                embeddedContent = embed.html;
              }

              var $embed = $(document.createElement('div'));
              $embed.addClass('embed');
              if(chatItemView.expandFunction) {
                chatItemView.expandFunction($embed);
              }

              if (embed.maxWidth) {
                $embed.css({ "max-width": embed.maxWidth + "px" });
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

})();
