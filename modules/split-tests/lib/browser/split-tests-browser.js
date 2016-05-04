'use strict';

function getCookie(cookieName) {
  return decodeURIComponent(document.cookie.replace(new RegExp("(?:(?:^|.*;)\\s*" + encodeURIComponent(cookieName).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=\\s*([^;]*).*$)|^.*$"), "$1")) || null;
}

function getVariant(testName) {
  return getCookie('variant_' + testName);
}

function listVariants() {
  var aKeys = document.cookie.replace(/((?:^|\s*;)[^\=]+)(?=;|$)|^\s*|\s*(?:\=[^;]*)?(?:\1|$)/g, "").split(/\s*(?:\=[^;]*)?;\s*/);
  return aKeys.reduce(function(memo, key) {
    if (key.indexOf('variant_') !== 0) return memo;

    var value = getCookie(key);
    memo[key] = value;
    return memo;
  }, {});
}

module.exports = {
  getVariant: getVariant,
  listVariants: listVariants
};
