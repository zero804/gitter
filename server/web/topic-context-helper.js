"use strict";

module.exports = function topicsContextHelper(context){
  if(!context) return;
  var data;
  try{ data = JSON.stringify(context); }
  catch(e) {
    //TODO logging ...
    return;
  }
  if(!data) { return; }
  return '<script>' + 'window.context = ' + data + ';'  + '</script>';
};
