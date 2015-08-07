// credit to @lazd (https://github.com/lazd) - https://github.com/wycats/handlebars.js/issues/249
module.exports = function(number, singular, plural) {
  if (number === 1) return singular;
  return (typeof plural === 'string') ? plural : singular + 's';
};
