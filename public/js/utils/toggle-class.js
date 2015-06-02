'use strict';

function toggleClass(el, className, state) {
  if(state) {
    el.classList.add(className);
  } else {
    el.classList.remove(className);
  }
}

module.exports = toggleClass;
