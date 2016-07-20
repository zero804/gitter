"use strict";

var Promise = require('bluebird');

var forum;
function buildForum(){
  return { key: 'THIS IS THE NEWS' };
}
function getForum(){
  if(!forum) { forum = buildForum(); }
  return forum;
}

module.exports = {
  id: 'forumId',
  show: function(req, res){
    return Promise.resolve(getForum());
  }
};
