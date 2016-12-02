"use strict";

var safeJson = require('gitter-web-templates/lib/safe-json.js');

module.exports = function topicsContextHelper(context){
  if(!context) return;
  var data;
  try{ data = JSON.stringify(context); }
  catch(e) {
    //TODO logging ...
    return;
  }
  if(!data) { return; }
  data = safeJson(JSON.stringify(data));
  return '<script>' + 'window.jsonContext = ' + data + ';' + '</script>';
};
