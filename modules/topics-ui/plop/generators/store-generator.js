"use strict";

var path = require('path');

module.exports = function(plop) {

  plop.setGenerator('store', {
    description: 'Generate a store',
    prompts: [{
      type: 'input',
      name: 'name',
      message: 'What is the name of your resource',
      validate: function (value) {
        if ((/.+/).test(value)) { return true; }
        return 'name is required';
      }
    },
    {
      type: 'list',
      name: 'resourceType',
      message: 'What kind of resource are you modeling',
      choices: [ 'Model', 'Collection' ]
    }],
    actions: function(data){

      var serverSideTemplate = data.resourceType === 'Collection' ?
        path.resolve(__dirname, '../templates/store-server-collection.txt') :
        path.resolve(__dirname, '../templates/store-server-model.txt');

      var serverSideTestTemplate = data.resourceType === 'Collection' ?
        path.resolve(__dirname, '../templates/store-server-collection-test.txt') :
        path.resolve(__dirname, '../templates/store-server-model-test.txt');

      var clientSideTemplate= data.resourceType === 'Collection' ?
        path.resolve(__dirname, '../templates/store-client-collection.txt') :
        path.resolve(__dirname, '../templates/store-client-model.txt');

      var clientSideTestTemplate = data.resourceType === 'Collection' ?
        path.resolve(__dirname, '../templates/store-client-collection-test.txt') :
        path.resolve(__dirname, '../templates/store-client-model-test.txt');

      return [{
        type: 'add',
        // The plop templates don't work with backslashes :(
        path: path.resolve(__dirname, '../../server/stores/{{dashCase name}}-store.js').replace(/\\/g, '/'),
        templateFile: serverSideTemplate
      },
      {
        type: 'add',
        // The plop templates don't work with backslashes :(
        path: path.resolve(__dirname, '../../test/specs/server/stores/{{dashCase name}}-store--test.js').replace(/\\/g, '/'),
        templateFile: serverSideTestTemplate,
      },
      {
        type: 'add',
        // The plop templates don't work with backslashes :(
        path: path.resolve(__dirname, '../../browser/js/stores/{{dashCase name}}-store.js').replace(/\\/g, '/'),
        templateFile: clientSideTemplate
      },
      {
        type: 'add',
        path: path.resolve(__dirname, '../../test/specs/browser/stores/{{dashCase name}}-store-test.js'),
        templateFile: clientSideTestTemplate
      }];

    }
  });
};
