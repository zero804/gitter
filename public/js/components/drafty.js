'use strict';

var _ = require('underscore');

var EVENTS = ['change', 'keydown', 'click', 'cut', 'paste'];
var TEST_KEY = '_drafty_test_key';

var windowLocalStorage;

try { windowLocalStorage = window.localStorage; } catch(e) {}

/* Attempts to use localStorage to check whether it's actually available for use */
function isLocalStorageAvailable() {
  if (!windowLocalStorage) return false;
  try {
    windowLocalStorage[TEST_KEY] = 1;
    windowLocalStorage.removeItem(TEST_KEY);
  } catch(e) {
    return false;
  }
}

/* Null storage driver for when localStorage isn't available */
function InMemoryStore() {
  this.values = {};
}

InMemoryStore.prototype = {
  get: function(key) {
    return this.values[key] || '';
  },
  set: function(key, value) {
    this.values[key] = value;
  },
  remove: function(key) {
    delete this.values[key];
  }
};

/* Localstorage, the default driver */
function LocalStorageStore() {
}

LocalStorageStore.prototype = {
  get: function(key) {
    try {
      return windowLocalStorage[key] || '';
    } catch(e) {
      return '';
    }
  },

  set: function(key, value) {
    try {
      windowLocalStorage[key] = value;
    } catch(e) {
    }
  },

  remove: function(key) {
    try {
      windowLocalStorage.removeItem(key);
    } catch(e) {
    }
  }
};

function Drafty(el, uniqueId) {
  this.el = el;
  if(!uniqueId) {
    uniqueId =  window.location.pathname.split('/').splice(1).join('_');
  }

  if (isLocalStorageAvailable()) {
    this.store = new LocalStorageStore();
  } else {
    this.store = new InMemoryStore();
  }

  this.uniqueId = uniqueId;

  var value = this.store.get('drafty_' + this.uniqueId);

  if(value && !el.value) {
    el.value = value;
  }

  var periodic = _.throttle(this.update.bind(this), 1000, { leading: false });
  this.updatePeriodic = periodic;

  EVENTS.forEach(function(e) {
    el.addEventListener(e, periodic, false);
  });

  this.update = this.update.bind(this);
}

Drafty.prototype.refresh = function (){
  var value = this.store.get('drafty_' + this.uniqueId);
  this.el.value = value;
};

Drafty.prototype.update = function() {
  var value = this.el.value;

  /* Don't save anything too long, as it kills localstorage */
  if(value && value.length > 4096) {
    value = '';
  }

  if(value) {
    this.store.set('drafty_' + this.uniqueId, value);
  } else {
    this.reset();
  }
};

Drafty.prototype.reset = function() {
  this.store.remove('drafty_' + this.uniqueId);
};

Drafty.prototype.disconnect = function() {
  var periodic = this.updatePeriodic;
  var el = this.el;
  EVENTS.forEach(function(e) {
    el.removeEventListener(e, periodic, false);
  });
};

Drafty.prototype.setUniqueId = function(newUniqueId) {
  // TODO: consider saving the current text before the switch?
  this.uniqueId = newUniqueId;
  this.refresh();
};

module.exports = function(element, id) {
  return new Drafty(element, id);
};
