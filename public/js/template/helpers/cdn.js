"use strict";

var cdn = require('gitter-web-cdn');

var Handlebars = require('handlebars/runtime').default;
Handlebars.registerHelper('cdn', cdn);
