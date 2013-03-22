/**
 * Module dependencies.
 */

var AssertionError = require('assert').AssertionError;
var callsite = require('callsite');
var fs = require('fs');

/**
 * Expose `assert`.
 */

module.exports = process.env.NO_ASSERT ? function(){} : assert;

/**
 * Assert the given `expr`.
 */

function assert(expr, level, msg) {
  if (expr) return;

  level = level || 1;
  var stack = callsite();
  var call = stack[level];
  var file = call.getFileName();
  var lineno = call.getLineNumber();
  var src = fs.readFileSync(file, 'utf8');
  var line = src.split('\n')[lineno-1];
  src = line.match(/assert(.*)/)[1];

  var err = new AssertionError({
    message: src + (msg ? "\n\t" + msg : ""),
    stackStartFunction: stack[level - 1].fun
  });

  throw err;
}

assert.strictEqual = function (a, b) {
  assert(a == b, 2, "Values: LS: " + a + ", RS: " + b);
};

assert.notStrictEqual = function (a, b) {
  assert(a != b, 2, "Values: LS: " + a + ", RS: " + b);
};

assert.strictEqual = function (a, b) {
  assert(a === b, 2, "Values: LS: " + a + ", RS: " + b);
};

assert.notStrictEqual = function (a, b) {
  assert(a !== b, 2, "Values: LS: " + a + ", RS: " + b);

};
