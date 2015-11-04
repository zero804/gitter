'use strict';

// loosey goosey first order approximation
var protocol = '([^:]+:)';
var host = '([^/]+)';
var pathname = '(\/[^?#]+)';
var search = '((\\?[^#]*)?)';
var hash = '((#.*)?)';

var URL_PARSE_EXPRESSION = protocol+'\/\/'+host+pathname+search+hash;

function parseSearch(search) {
  // trim ? and # from the start
  while (search && ['?', '&'].indexOf(search[0]) !== -1) {
    search = search.slice(1);
  }

  if (!search) return;

  var query = {};
  var terms = search.split('&');
  terms.forEach(function(term) {
    var termParts = term.split('=');
    // join all parts after the first = together into one just in case there
    // were multiple = characters
    query[termParts[0]] = termParts.slice(1).join('=');
  });
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
  for (var key in query) {
    if (query.hasOwnProperty(key)) {
      terms.push(key + '=' + query[key]);
    }
  }
  return terms.join('&');
}

function formatUrl(opts) {
  var url = opts.protocol + '//' + opts.hostname;
  if (opts.port) url = url + ':' + opts.port;
  url = url + opts.pathname;
  if (opts.query) url = url + '?' + formatSearch(opts.query);
  if (opts.hash) url = url + opts.hash;
  return url;
}

module.exports = {
  parseUrl: parseUrl,
  formatUrl: formatUrl
}
