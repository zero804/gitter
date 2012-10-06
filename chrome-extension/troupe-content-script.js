chrome.storage.sync.get("troupeToken", function(data) {
  var token = data.troupeToken;
  if(token) {
    return;
  }

  var xhr = new XMLHttpRequest();
  xhr.onreadystatechange = function() {
      if (xhr.readyState == 4) {
        var troupeToken = xhr.responseText;

        chrome.storage.sync.set({'troupeToken': troupeToken});
      }
  };

  xhr.open("GET", "/token");
  xhr.send(null);
});


