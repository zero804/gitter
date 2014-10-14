define([], function() {
  "use strict";

  // "?foo=bar&fish=chips" -> { foo: bar, fish: chips }
  function parse(qs) {
    if(!qs || qs.length <= 1) return {};

    return qs
      .substring(1)
      .split('&')
      .reduce(function(memo, pair) {
        var splitPair = pair.split('=', 2).map(decodeURIComponent);

        memo[splitPair[0]] = splitPair[1];
        return memo;
      }, {});
  }

  return parse(window.location.search);
});
