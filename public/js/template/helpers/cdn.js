"use strict";

var cdn = require('utils/cdn');

var Handlebars = require('handlebars/runtime').default;
Handlebars.registerHelper( 'cdn', cdn);

