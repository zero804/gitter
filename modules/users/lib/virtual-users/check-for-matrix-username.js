'use strict';

// We assume any username with a colon `:` in it, is a virtualUser from Matrix
function checkForMatrixUsername(username) {
  return username.indexOf(':') >= 0;
}

module.exports = checkForMatrixUsername;
