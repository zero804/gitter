'use strict';

/**
 * Chains a comparator function to another comparator
 * and returns the result of the first comparator, unless
 * the first comparator returns 0, in which case the
 * result of the second comparator is used.
 */
function makeChainedComparator(first, next) {
  return function(a, b) {
    var result = first(a, b);
    if (result !== 0) return result;
    return next(a, b);
  }
}

/**
 * Given an array of comparators, returns a new comparator with
 * descending priority such that
 * the next comparator will only be used if the precending on returned
 * 0 (ie, found the two objects to be equal)
 *
 * Allows multiple sorts to be used simply. For example,
 * sort by column a, then sort by column b, then sort by column c
 */
function compositeComparator(comparators) {
  return comparators.reduceRight(function(memo, comparator) {
    return makeChainedComparator(comparator, memo);
  });
}


module.exports = compositeComparator;
