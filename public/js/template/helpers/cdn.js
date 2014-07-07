define([
  'utils/cdn',
  'handlebars'
], function (cdn, Handlebars ) {
  "use strict";

  Handlebars.registerHelper( 'cdn', cdn);
});
