'use strict';

const debug = require('debug')('gitter:app:matrix-bridge:check-if-dates-same');

function checkIfDatesSame(rawDate1, rawDate2) {
  const date1 = new Date(rawDate1).getTime();
  const date2 = new Date(rawDate2).getTime();
  debug('checkIfDatesSame', rawDate1, rawDate2, date1, date2);

  const isNoDate1 = rawDate1 === null || rawDate1 === undefined;
  const isNoDate2 = rawDate2 === null || rawDate2 === undefined;
  if (isNoDate1 && isNoDate2) {
    return true;
  } else if (isNoDate1 !== isNoDate2) {
    return false;
  } else if (date1 === date2) {
    return true;
  }

  return false;
}

module.exports = checkIfDatesSame;
