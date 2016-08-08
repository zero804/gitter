"use strict";

var path = require('path');
var glob = require('glob');

module.exports = function(plop){

  var baseConstFilePath = path.resolve(__dirname, '../../browser/js/constants');
  var constFiles = glob.sync(baseConstFilePath + '/**/*.js').map(function(fullPath){
    return fullPath.replace(baseConstFilePath + '/', '');
  });

  plop.setGenerator('action', {
    description: 'Generate a system action',
    prompts: [{
      type: 'input',
      name: 'name',
      message: 'What is the name of your action?',
      validate: function (value) {
        if ((/.+/).test(value)) { return true; }
        return 'name is required';
      }
    }, {
      type: 'list',
      name: 'constantFile',
      message: 'Pick a file to add you event constant to',
      choices: constFiles,
    }],
    actions: function(data){

      console.log('-----------------------');
      console.log(data);
      console.log('-----------------------');

      return [{
        type: 'modify',
        path: path.resolve(__dirname, '../../browser/js/constants/', data.constantFile),
        pattern: /};/gi,
        template: "  {{constantCase name}}: '{{dashCase name}}',\n};"
      }];

    }
  });

};
