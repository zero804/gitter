// execute callback when the page is ready:
Zepto(function($){
  "use strict";

  var baseUrl = 'http://localhost:5000/';

  var template = $('#template').html();

  var allUnreadItems = 0;

  chrome.browserAction.setBadgeBackgroundColor({
            color: "#1dce73"
          });

  $.getJSON(baseUrl + 'troupes/', function(data){
    $(document.body).empty();
    $.each(data, function(index, item) {
      var el = $(template);

      el.find('.trpTroupeName').text(item.name);

      if(item.unreadItems) {
        el.find('.trpBadge').text(item.unreadItems);
        console.log(item.unreadItems);
        allUnreadItems = allUnreadItems + item.unreadItems;
        chrome.browserAction.setBadgeText({text:allUnreadItems.toString()});
      } else {
        el.find('.trpTroupeBadgeContainer').hide();
      }

      el.on('click', function() {
        chrome.tabs.create({'url': baseUrl + item.uri}, function(tab) {
          // Tab opened.
        });
      });
      $(document.body).append(el);
    });
  });

});