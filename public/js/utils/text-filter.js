'use strict';


module.exports = (function() {


  function createRegExpsForQuery(queryText) {
    var normalized = ("" + queryText).trim().toLowerCase();
    var parts = normalized.split(/[\s\'']+/)
                          .filter(function(s) { return !!s; })
                          .filter(function(s, index) { return index < 10; });

    return parts.map(function(part) {
      part = part.replace(/\*|\+|\$/g, '');
      return new RegExp("\\b" + part, "i");
    });
  }

  function getFields(fields, item) {
    if(item.get) {
      // Handle backbone model objects
      return fields.map(function(field) { return item.get(field); }).filter(function(f) { return !!f; });
    }

    return fields.map(function(field) { return item[field]; }).filter(function(f) { return !!f; });
  }

  return function createTextFilter(options) {
    function nopFilter() {}
    var query = options.query;
    var fields = options.fields;

    if(!query) return nopFilter;

    var regexps = createRegExpsForQuery(query);

    return function(item) {
      // Search the items or its fields
      var searchable = fields ? getFields(fields, item) : [item];
      return searchable.some(function(item) {
        return regexps.every(function(regexp) {
          return item.match(regexp);
        });
      });
    };

  };


})();

