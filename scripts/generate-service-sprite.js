var Builder = require( 'node-spritesheet' ).Builder;
var services = require('gitter-services');

var images = [];
Object.keys(services).forEach(function(serviceKey) {
  var service = services[serviceKey];
  Object.keys(service.icons).map(function(iconKey) {
    var icon = service.icons[iconKey];
    images.push(icon);
  });
});

var builder = new Builder({
    outputDirectory: __dirname+'/../public/sprites',
    outputCss: 'services.css',
    selector: '.service',
    images: images
});

builder.addConfiguration( "legacy", {
    pixelRatio: 1,
    outputImage: 'services.png'
});

builder.addConfiguration( "retina", {
    pixelRatio: 2,
    outputImage: 'services@2x.png'
});

builder.build( function() {
    console.log( "Built from " + builder.files.length + " images" );
});
