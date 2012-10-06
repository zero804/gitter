window.setTimeout(function() {
  console.log("Connecting to NOW");
  var now = nowInitialize('http://localhost:5000/');

  now.onTroupeUnreadCountsChange = function() {
    console.log(this, arguments);
  };

  now.onTroupeChatMessage = function() {
    console.log(this, arguments);
  };

  now.onUserLoggedIntoTroupe = function() {
    console.log(this, arguments);
  };

  now.ready(function() {
    window.alert("Connected!");
  });

}, 1000);

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