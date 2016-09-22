'use strict';

var StatusError = require('statuserror');

function parseTagsFilter(tags) {
  // a comma-separated list of tags to be split into an array.
  return tags.split(',');
}

function parseCategoryFilter(categorySlug) {
  return categorySlug;
}

function parseUsernameFilter(username) {
  return username;
}

function parseSinceFilter(since) {
  // must be an iso formatted date
  var date;
  var dateString;

  try {
    date = new Date(since);
    dateString = date.toISOString();
  } catch(err) {
    // ignore, because we handle it below
  }

  // must have parsed as a date object and converting that back to an iso
  // string should give us what was passed in in the first place.
  if (!(dateString && dateString === since)) throw new StatusError(400, "Since does not look like an iso string formatted date.");

  return date;
}

var knownFilters = {
  tags: parseTagsFilter,
  category: parseCategoryFilter,
  username: parseUsernameFilter,
  since: parseSinceFilter
};

function parseSort(value) {
  var sort = {};

  var values = value.split(',');

  values.forEach(function(value) {
    // -lastChanged -> { lastChanged: -1 }
    // lastChanged -> { lastChanged: 1 }
    if (!value) return;

    // Key is the database key that will be used. Usually it matches with the
    // input on the URI, but in the id -> _id case, it doesn't. Probably more
    // cases in future.
    var key = (value === '_id') ? '_id' : value;

    if (key[0] === '-') {
      sort[key.slice(1)] = -1;
    } else {
      sort[key] = 1;
    }
  });

  return sort;
}

function getTopicsFilterSortOptions(query) {
  // both of these should be undefined or a non-empty object
  var filter;
  var sort;

  var keys = Object.keys(query);
  keys.forEach(function(key) {
    if (key === 'sort') {
      // example: sort=-repliesTotal,-id -> {repliesTotal: -1, _id: -1}
      sort = parseSort(query.sort);
      return;
    }

    var parser = knownFilters[key];
    if (parser) {
      // NOTE: the first known filter this encounters will mean the undefined
      // var becomes an object
      filter = filter || {};

      /*
      Everything comes from URI query params and should be stringds, but we
      make sure just in case, then perform something on it to get to the
      option var. Not too much validation gets done, because the options get
      validated afterwards.
      */
      filter[key] = parser(String(query[key]));
      return;
    }

    // NOTE: Ignore unknown keys becasue they could be URL parameters used by
    // other things.
  });

  var options = {}
  if (filter) options.filter = filter;
  if (sort) options.sort = sort;
  return options;
}

module.exports = getTopicsFilterSortOptions
