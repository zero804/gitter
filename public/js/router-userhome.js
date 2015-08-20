"use strict"
require('utils/frame-utils');

window.addEventListener('message', function (message){
  var data = JSON.parse(message.data);
  if(data.type !== 'change:room') return;
  document.location.href = data.url;
});
