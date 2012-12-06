/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var http = require('http'),
    res = http.ServerResponse.prototype;

/* Monkey patch onto the response */
/*
 * This is needed as connect/express attempt to be too smart for their own good behind proxies (like NGINX) and convert relative URLS into absolute URLS. Unfortunately behind a proxy the URL will proably we wrong.
 * TODO: raise this as a bug in express
 */
res.relativeRedirect = function(status, url){
  var req = this.req;
  var body;

  if(!url) {
    url = status;
    status = 302;
  }

  // Support text/{plain,html} by default
  if (req.accepts('html')) {
    body = '<p>' + http.STATUS_CODES[status] + '. Redirecting to <a href="' + url + '">' + url + '</a></p>';
    this.header('Content-Type', 'text/html');
  } else {
    body = http.STATUS_CODES[status] + '. Redirecting to ' + url;
    this.header('Content-Type', 'text/plain');
  }

  // Respond
  this.statusCode = status;
  this.header('Location', url);
  this.end(body);
};
