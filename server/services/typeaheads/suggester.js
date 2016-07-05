'use strict';

var Suggester = function() {
  this.suggestions = [];
};

Suggester.prototype.add = function(id, inputs) {
  inputs.forEach(function(input) {
    var inputWithoutWhitespace = input.split(/\s/).filter(Boolean).join('');
    this.suggestions.push({ id: id, input: inputWithoutWhitespace.toLowerCase() });
  }, this);
};

Suggester.prototype.suggest = function(text) {
  var lcText = text.toLowerCase();
  var matches = {};
  this.suggestions.forEach(function(suggestion) {
    if (suggestion.input.indexOf(lcText) === 0) {
      matches[suggestion.id] = true;
    }
  });

  return Object.keys(matches);
}

module.exports = Suggester;
