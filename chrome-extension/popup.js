// execute callback when the page is ready:
Zepto(function($){
  "use strict";

  var baseUrl = 'http://localhost:5000/';

  var template = $('#template').html();

  $.getJSON(baseUrl + 'troupes/', function(data){
    $(document.body).empty();
    $.each(data, function(index, item) {
      var el = $(template);

      el.find('.trpTroupeName').text(item.name);

      if(item.unreadItems) {
        el.find('.trpBadge').text(item.unreadItems);
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