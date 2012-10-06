(function() {
  function scriptLoaded() {
    var socket = io.connect('http://localhost:5000');
    socket.on('message', function (data) {
      console.log(data);
      socket.emit('my other event', { my: 'data' });
    });

    socket.on('connect', function () { // TIP: you can avoid listening on `connect` and listen on events directly too!
      socket.send('hello');
    });
  }

  var fileref = document.createElement('script');
  fileref.setAttribute('type', 'text/javascript');
  fileref.setAttribute('src', 'https://localhost/socket.io/socket.io.js');
  fileref.onload = scriptLoaded;
  document.body.appendChild(fileref);
})();



/*

var ws;

function openSocket() {
  ws = new WebSocket("ws://localhost:5000/websocket");

  ws.onopen = function() {
    chrome.browserAction.setIcon({ "path": "icon_blue.png" });
    chrome.browserAction.setBadgeText({ "text": "" });
  };

  ws.onmessage = function(e) {
    var notify = webkitNotifications.createNotification(
      "icon_blue.png",
      "Something like",
      e.data
    );
    notify.show();

    setTimeout(function() {
      notify.cancel();
    },3000);
  };

  ws.onclose = function(e) {
    ws = undefined;

    chrome.browserAction.setIcon({ "path": "icon_red.png" });
    chrome.browserAction.setBadgeText({ "text": "!" });
  };
}

(function() {
  openSocket();

  chrome.browserAction.onClicked.addListener(function() {
    if (ws === undefined) {
      openSocket();
    } else {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(prompt('send text'));
      }
    }
  });
})();

*/