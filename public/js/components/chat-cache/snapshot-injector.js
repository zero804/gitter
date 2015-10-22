'use strict';

var context        = require('utils/context');
var chatCollection = require('collections/instances/integrated-items').chats;

context.troupe().on('change:id', onRoomChange);

function onRoomChange() {

}
