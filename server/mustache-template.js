/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true, process: false */
"use strict";

var fs = require("fs");
var path = require("path");
var hogan = require('hogan');

module.exports = {
  compile : function(source, options) {
    var views = (options && options.settings && options.settings.views) || './views/';

    console.log("MOO" + views);

    var tc = hogan.compile(source);
    // we need overwrite for this specific template
    // rp (RenderPartials) function to provide partial content
    var orp = tc.rp;
    tc.rp = function(name, context, partials, indent) {
      var partial = partials[name];
      if (partial == null) {
        var partialFileName = views + '/' + name
            + (options.extension || '.mustache')
        partial = path.existsSync(partialFileName) ? fs.readFileSync(
            partialFileName, "utf-8") : "";
        partials[name] = hogan.compile(partial.toString());
      }
      return orp.call(this, name, context, partials, indent);
    }

    return function(options) {
      var html = tc.render(options, options.partials);
      if (options.body != null) {
        html = html.replace("", options.body);
      }
      return html;
    }
  }
};
