'use strict';
var _ = require('underscore');
var context = require('utils/context');

var EVENTS = ['change', 'keydown', 'click', 'cut', 'paste'];

function Drafty(el, uniqueId) {
  this.el = el;
  if(!uniqueId) {
    uniqueId =  window.location.pathname.split('/').splice(1).join('_');
  }

  this.store = window.localStorage;
  this.uniqueId = uniqueId;

  var value = this.store['drafty_' + this.uniqueId];

  if(value && !el.value) {
    el.value = value;
  }

  var periodic = _.throttle(this.update.bind(this), 1000, { leading: false });
  this.updatePeriodic = periodic;

  EVENTS.forEach(function(e) {
    el.addEventListener(e, periodic, false);
  });

  this.update = this.update.bind(this);

  //window.addEventListener("beforeunload", this.update, false);
  context.troupe().on('change:id', function (model){
    this.uniqueId = model.get('id');
    this.refresh();
  }, this);

}

Drafty.prototype.refresh = function (){
  var value = this.store['drafty_' + this.uniqueId] || '';
  this.el.value = value;
};

Drafty.prototype.update = function() {
  var value = this.el.value;

  /* Don't save anything too long, as it kills localstorage */
  if(value && value.length > 4096) {
    value = '';
  }

  if(value) {
    this.store['drafty_' + this.uniqueId] = value;
  } else {
    this.reset();
  }
};

Drafty.prototype.reset = function() {
  this.store.removeItem('drafty_' + this.uniqueId);
};

Drafty.prototype.disconnect = function() {
  var periodic = this.updatePeriodic;
  var el = this.el;
  EVENTS.forEach(function(e) {
    el.removeEventListener(e, periodic, false);
  });
  window.removeEventListener("beforeunload", this.update, false);
};

module.exports = function(element, id) {
  return new Drafty(element, id);
};



