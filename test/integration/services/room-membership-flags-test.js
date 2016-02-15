"use strict";

var testRequire = require('../test-require');
var assert = require('assert');

describe('room-membership-flags', function () {
  var underTest;
  before(function() {
    underTest = testRequire('./services/room-membership-flags');
  });

  describe('getModeFromFlags', function() {
    var FIXTURES = {
      "01101": "all",
      "11101": "all", // Ignore other values
      "00100": "mute",
      "10100": "mute", // Ignore other values
      "01110": "announcements",
      "11110": "announcements", // Ignore other values
    };

    Object.keys(FIXTURES).forEach(function(flags) {
      var mode = FIXTURES[flags];

      it('should handle ' + mode, function() {
        var result = underTest.getModeFromFlags(parseInt(flags,2));
        assert.strictEqual(result, mode);
      });
    });

  });

  describe('getUpdateForMode', function() {
    var FIXTURES = {
      "all": { and: "1111111111111111111111111101", or: "1101", lurk: false },
      "announcements": { and: "1111111111111111111111111110", or: "1110", lurk: true },
      "mention": { and: "1111111111111111111111111110", or: "1110", lurk: true },
      "mute": { and: "1111111111111111111111110100", or: "0100", lurk: true },
    };

    var FLAG_VALUES = [
      '0000000000000000000000000000',
      '1111111111111111111111111111',
      '1010101010101010101010101010',
      '1001001001001001001001001001'
    ];

    Object.keys(FIXTURES).forEach(function(mode) {
      var values = FIXTURES[mode];

      it('should handle ' + mode, function() {
        var result = underTest.getUpdateForMode(mode);
        assert.deepEqual(result, {
          $set: { lurk: values.lurk },
          $bit: { flags: {
                    and: parseInt(values.and, 2),
                    or: parseInt(values.or, 2)
                }
          }
        });

        FLAG_VALUES.forEach(function(flags) {
          var flagValue = parseInt(flags, 2);
          // Test for bit idempotency
          var result1 = (flagValue & parseInt(values.and, 2)) | parseInt(values.or, 2);
          var result2 = (flagValue | parseInt(values.or, 2)) & parseInt(values.and, 2);

          assert.strictEqual(result1, result2);
          var newMode = underTest.getModeFromFlags(result1);

          assert.strictEqual(newMode, mode === "mention" ? "announcements" : mode, "For flags " + flags + ", expected mode " + mode + " got " + newMode);
        });

      });
    });

  });

  describe('getLurkForFlags', function() {
    var FIXTURES = {
      "01101": false,
      "11101": false,
      "00100": true,
      "10100": true,
      "01110": true,
      "11110": true, // Ignore other values
    };

    Object.keys(FIXTURES).forEach(function(flags) {
      var isLurking = FIXTURES[flags];

      it('should handle ' + flags, function() {
        var result = underTest.getLurkForFlags(parseInt(flags, 2));
        assert.strictEqual(result, isLurking);
      });
    });

  });

  describe('getLurkForMode', function() {
    var FIXTURES = {
      "all": false,
      "announcements": true,
      "mention": true,
      "mute": true
    };

    Object.keys(FIXTURES).forEach(function(mode) {
      var isLurking = FIXTURES[mode];

      it('should handle ' + mode, function() {
        var result = underTest.getLurkForMode(mode);
        assert.strictEqual(result, isLurking);
      });
    });
  });

});
