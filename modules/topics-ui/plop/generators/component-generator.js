"use strict";

var path = require('path');
var glob = require('glob');

module.exports = function(plop) {

  var baseComponentDir = path.resolve(__dirname, '../../shared/components');
  var baseComponentDirs = glob.sync(baseComponentDir + '/*/');
  var componentDirs = ['./'].concat(baseComponentDirs.map(function(folderPath){
    return '.' + folderPath.replace(baseComponentDir, '');
  }));

  plop.setGenerator('component', {
    description: 'Generate a react component',
    prompts: [{
      type: 'input',
      name: 'name',
      message: 'What is the name of your component?',
      validate: function (value) {
        if ((/.+/).test(value)) { return true; }
        return 'name is required';
      }
    },
    {
      type: 'list',
      name: 'subFolder',
      message: 'Pick a folder for your component',
      choices: componentDirs,
    }],
    actions: function(data){

      console.log('-----------------------');
      console.log(path.resolve(__dirname, '../../shared/components', data.subFolder));
      console.log('-----------------------');

      return [{
        type: 'add',
        path: path.resolve(__dirname, '../../shared/components', data.subFolder) + '{{dashCase name}}',
        templateFile: path.resolve(__dirname, '../templates/component.txt'),
      }];
    }
  });

};
