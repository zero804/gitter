/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var StatusError = require('statuserror');

/* Ensure that the last promise has returned a value */
exports.required = function(value) {
	if(!value) throw new StatusError(404, 'Value required');
	return value;
};

/* Always return a given value from the promise */
// Q ALREADY DOES THIS
// exports.value = function(value) {
// 	return function() {
// 		return value;
// 	};
// };


