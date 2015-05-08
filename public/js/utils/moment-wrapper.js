"use strict";

/* This require looks HORRIBLE, but it's a way to use the non-aliased moment */
/* Webpack config will alias all usages of moment to this module */
var realMoment = require('../../../node_modules/moment');
var context = require('utils/context');

realMoment.calendar = {
  lastDay : '[Yesterday at] LT',
  sameDay : '[Today at] LT',
  nextDay : '[Tomorrow at] LT',
  lastWeek : '[last] dddd [at] LT',
  nextWeek : 'dddd [at] LT',
  sameElse : 'LL'
};

realMoment.lang(context.lang());
realMoment.defaultFormat = 'YYYY-MM-DDTHH:mm:ss.SSSZ';

module.exports = realMoment;
