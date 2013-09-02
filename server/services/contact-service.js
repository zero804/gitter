/*jshint globalstrict:true, trailing:false, unused:true, node:true */
"use strict";

var persistence   = require("./persistence-service");
var statsService  = require("./stats-service");
var _             = require('underscore');
var winston       = require('winston');
var Q             = require('Q');

exports.ingestGoogleContacts = function(user, data, cb) {
  var contacts = [];

  if (data.feed && data.feed.entry) {
    _.each(data.feed.entry, function(entry) {

      var emails = _.inject(entry.gd$email, function(accum, email) {
        accum.push(email.address);
        return accum;
      }, []);

      var id   = entry.id.$t;
      var name = entry.title.$t || emails[0];

      if (emails.length > 0) contacts.push({id: id, name: name, emails: emails});
    });
  }

  winston.verbose('[contact] Importing contacts: ', contacts.length);

  var imported = _.inject(contacts, function(accum, contact) {
    var newContact = {
      userId  : user.id,
      source  : 'google',
      sourceId: contact.id,
      name    : contact.name,
      emails  : contact.emails
    };

    persistence.Contact.findOneAndUpdate({sourceId: newContact.sourceId}, {$set: newContact}, {upsert: true}, function(err, contact) {});

    accum.push(newContact);
    return accum;
  }, []);

  if (imported.length > 0) {
    statsService.userUpdate(user, {'import_contacts': 'Google'});
    statsService.event('import_contacts', {'userId': user.id});
  }


  cb(null, imported);
};

exports.find = function(user, pattern, cb) {
  var re    = new RegExp("\\b" + pattern, "i");
  var query = {'userId': user.id, $or: [{name: re}, {emails: re}]};

  persistence.Contact.find(query).exec(function(err, contacts) {
    var matches = _.inject(contacts, function(accum, contact) {
      var user = {
        displayName:    contact.name,
        email:          contact.emails[0],
        avatarUrlSmall: '/avatarForEmail/' + contact.emails[0],
        imported:       true
      };
      accum.push(user);
      return accum;
    }, []);

    cb(null, matches);
  });

};

exports.importedGoogleContacts = function(user, cb) {
  var query = {'userId': user.id, source: 'google'};

  persistence.Contact.find(query).exec(function(err, contacts) {
    cb((contacts.length !== 0) ? true : false);
  });
};

/**
 * Finds all contacts with the given email address and updates the contact with the userId of the
 * user that contact belongs to.
 *
 * @return promise of contacts
 */
exports.updateContactsWithUserId = function(email, userId) {
  return persistence.Contact.find({ emails: email, contactUserId: { $exists: false } })
    .execQ()
    .then(function(contacts) {
      winston.silly('Updating ' + contacts.length + ' contacts with userId');

      // Update and save all matching contacts
      return Q.all(contacts.map(function(contact) {
          contact.contactUserId = userId;
          return contact.saveQ();
        }))
        .thenResolve(contacts);
    });
};