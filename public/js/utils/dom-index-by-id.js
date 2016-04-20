'use strict'

module.exports = function mapChildrenById(el){
  var map = {};
  if(el) {
    for(var i = 0; i < el.children.length; i++){
      var child = el.children[i];
      map[child.id] = child;
    }
  }
  return map;
};
