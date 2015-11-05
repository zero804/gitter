'use strict';

// loosey goosey first order approximation
var protocol = '([^:]+:)';
var host = '([^/]+)';
var pathname = '(\/[^?#]*)';
var search = '((\\?[^#]*)?)';
var hash = '((#.*)?)';

var URL_PARSE_EXPRESSION = protocol+'\/\/'+host+pathname+search+hash;


function parseSearch(search) {
  // trim ?
  if (search && search[0] == '?') {
    search = search.slice(1);
  }

  if (!search) return {};

  var query = {};
  var terms = search.split('&');
  for (var i = 0; i < terms.length; i++) {
    var pair = terms[i];
    if (!pair) {
      continue;
    }
    var eqIndex = pair.indexOf('=');
    if (eqIndex < 0) {
      query[pair] = '';
    } else {
      query[pair.substr(0, eqIndex)] = pair.substr(eqIndex + 1);
    }
  }

  return query;
}

function parseUrl(url) {
  var regex = new RegExp(URL_PARSE_EXPRESSION);
  var match = url.match(regex);

  if (!match) return;

  // NOTE: some numbers are skipped because 0 is the entire match and 5 and 7 are
  // duplicates of the preceding numbers caused by the nested parenthesis

  var host = match[2];
  var hostParts = host.split(':');

  var protocol = match[1];
  var hostname = hostParts[0];
  var port = hostParts[1];
  var pathname = match[3];
  var query = parseSearch(match[4]);
  var hash = match[6] || undefined;

  return {
    protocol: protocol, // http: or https:
    hostname: hostname, // blah.com
    port: port,         // 8080 or undefined
    pathname: pathname, // /about/us or /
    query: query,       // {v: 1, s: 50} or undefined
    hash: hash,         // #footer or undefined
  };
}

function formatSearch(query) {
  var terms = [];
  // add them in order
  var keys = Object.keys(query);
  keys.sort();
  keys.forEach(function(key) {
    terms.push(key + '=' + query[key]);
  });
  return terms.join('&');
}

function formatUrl(opts) {
  var url = opts.protocol + '//' + opts.hostname;
  if (opts.port) {
    url = url + ':' + opts.port;
  }
  url = url + opts.pathname;
  if (opts.query && Object.keys(opts.query).length) {
    url = url + '?' + formatSearch(opts.query);
  }
  if (opts.hash) {
    url = url + opts.hash;
  }
  return url;
}

module.exports = {
  parseUrl: parseUrl,
  formatUrl: formatUrl
}
