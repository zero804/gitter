'use strict';

// Can't use `classList.toggle` with the second parameter (force)
// Because IE11 does not support it
var toggleClass = function(element, class1, force) {
  if(arguments.length === 3) {
    if(force) {
      element.classList.add(class1);
    }
    else {
      element.classList.remove(class1);
    }
  }
  else {
    element.classList.toggle(class1);
  }

  return force;
};

module.exports = toggleClass;
