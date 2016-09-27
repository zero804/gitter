"use strict";

var env = require('gitter-web-env');
var config = env.config;
var fs = require('fs');
var HandlebarsWrapper = require('gitter-web-templates/lib/handlebars-wrapper');
var path = require('path');
var _ = require('lodash');

var emailBasePath = config.get('email:emailBasePath');

var handlebarsWrapper = new HandlebarsWrapper();

function registerPartial(name) {
  var partialFileName = path.join(__dirname, '../templates/partials', name + '.hbs');
  var partialContent = fs.readFileSync(partialFileName, 'utf8');
  handlebarsWrapper.handlebars.registerPartial(name, partialContent);
}

registerPartial('topic_html_email_header')
registerPartial('topic_html_email_footer')

var CACHED = { };
function getCachedTemplate(templateName) {
  if(CACHED[templateName]) return CACHED[templateName];

  var templateFile = path.join(__dirname, '/../templates', templateName + '.hbs');
  CACHED[templateName] = handlebarsWrapper.compile(templateFile);
  return CACHED[templateName];
}

function mailerTemplate(templateName, data) {
  return getCachedTemplate(templateName)
    .then(function(template) {
      return template(_.extend({ }, data, {
        emailBasePath: emailBasePath,
        // Other globals go here...
      }));
    });
}

module.exports = mailerTemplate;
