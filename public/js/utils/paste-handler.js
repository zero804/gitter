'use strict';

var getFileName = function (file) {
  console.log('getFileName() ====================');
  return new Promise(function (resolve, reject) {
    file.getAsString(function (str) {
      if (!str) {
        return reject(new Error('File has no name'));
      }
      return resolve(str);
    });
  });
};

module.exports = function (pasteEvent) {
  var evt = pasteEvent.originalEvent || pasteEvent;
  // if (event.originalEvent.clipboardData.items.length > 1) {
        //   var file = event.originalEvent.clipboardData.items[1].getAsFile();

        //   if (file.type.indexOf('image/') < 0) {
        //     console.debug('not an image() ====================');
        //     return;
        //   }

        //   event.preventDefault();
  var file = evt.clipboardData.items[1].getAsFile(); // sync
  return Promise.all(file, getFileName(evt.clipboardData.items[0]));
};
