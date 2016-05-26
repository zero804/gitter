"use strict";

var assert = require('assert');
var testRequire = require('../../test-require');
var dateTzToUTC = testRequire('../shared/time/date-timezone-to-utc');

var TEST_CASES = [
  { year: 2015, month: 1, day: 1, utcOffset: -60, expected: '2014-12-31T23:00:00.000Z' },
  { year: 2015, month: 1, day: 1, utcOffset: +60, expected: '2015-01-01T01:00:00.000Z' },
  { year: 2015, month: 1, day: 1, utcOffset: undefined, expected: '2015-01-01T00:00:00.000Z' },
  { year: 2015, month: 1, day: 1, utcOffset: +480, expected: '2015-01-01T08:00:00.000Z' }, // Los Angeles
];

describe('date-timezone-to-utc', function() {

  describe('fixtures', function() {

    TEST_CASES.forEach(function(test, index) {
      it('should pass test case #' + (index + 1), function() {
        var result = dateTzToUTC(test.year, test.day, test.day, test.utcOffset);
        assert.strictEqual(result.toISOString(), test.expected);
      });
    });

  });

});
