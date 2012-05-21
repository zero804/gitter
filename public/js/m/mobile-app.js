require({
  paths: {
    jquery: '/js/libs/jquery/jquery',
    jqueryM: '/js/libs/jquery.mobile-1.1.0/jquery.mobile-1.1.0',
    underscore: '/js/libs/underscore/underscore-1.3.1',
    backbone: '/js/libs/backbone/backbone-0.9.1-min',
    text: '/js/libs/require/text',
    mustache: '/js/libs/mustache/mustache',
    templates: '/templates/m',
    order : '/js/libs/require/order',
    'jquery.mobile.router': '/js/libs/jquery.mobile.router/jquery.mobile.router'
  }
}, [
  'order!jquery',
  'order!jquery.mobile.router',
  'order!jqueryM',
  'underscore',
  'backbone',
  'order!router'
], function($, $$, _, Backbone, AppRouter){
});
