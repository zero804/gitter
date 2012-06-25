/*jshint globalstrict:true, trailing:false */
/*global console:false, require: true, module: true */
"use strict";

var troupeService = require("../services/troupe-service"),
    mailService = require("../services/mail-service"),
    fileService = require("../services/file-service"),
    winston = require('winston');

function compose(m, attachments) {
  return {
    fromName: m.fromName,
    date: m.date,
    subject: m.subject,
    troupeId: m.troupeId,
    from: m.from,
    id: m.id,
    mail: m.mail,
    attachments: attachments
  };
}

module.exports = {
    index: function(req, res, next) {
      mailService.findByTroupe(req.troupe.id, function(err, mails) {
        if(err) return next(err);
        res.send(mails.narrow());
      });
    },

    "new": function(req, res){
      res.send(500);
    },

    create: function(req, res) {
      res.send(500);
    },

    show: function(req, res){
      var m = req.mail;

      console.dir(m);

      if(m.attachments) {
        var fileIds = m.attachments.map(function(item) { return item.fileId; } ).filterNulls();
        if(fileIds) {
          fileService.findByIds(fileIds, function(err, files) {
            if(err) return res.send(500);

            var indexedFiles = files.indexById();

            var attachments = m.attachments.map(function(item) { 
              var file = indexedFiles[item.fileId];
              if(!file) {
                winston.warn('Unable to find attachment. Something might be wrong');
                return null;
              }

              return {
                file: file.narrow(),
                version: item.version
              };

            });

            res.send(compose(m, attachments.filterNulls()));
          });

          return;
        }
      }

      res.send(compose(m, []));
    },

    edit: function(req, res){
      res.send(500);
    },

    update:  function(req, res){
      res.send(500);
    },

    destroy: function(req, res){
      res.send(500);
    },

    load: function(id, callback){
      mailService.findById(id,callback);
    }

};
