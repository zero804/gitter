require([
  'handlebars'
], function ( Handlebars ) {

  function cdn ( url, model ) {
    return "/" + url;
  }

  Handlebars.registerHelper( 'cdn', cdn );
  return cdn;

});