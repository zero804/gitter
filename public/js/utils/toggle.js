'use strict';
module.exports = function(el, on) {
  if (!el) return;
  if (el.style.display === 'none') {
    if (on) el.style.display = '';
  } else {
    if (!on) el.style.display = 'none';
  }
};
