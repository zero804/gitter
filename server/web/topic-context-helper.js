"use strict";

var serialize = require('serialize-javascript');

module.exports = function topicsContextHelper(context){
  if(!context) return;
  var data;
  try{ data = JSON.stringify(context); }
  catch(e) {
    //TODO logging ...
    return;
  }
  if(!data) { return; }
  data = serialize(data, { isJSON: true });
  return '<script>' + 'window.jsonContext = ' + data + ';' + '</script>';
};
