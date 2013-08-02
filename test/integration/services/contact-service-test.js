/*jshint globalstrict:true, trailing:false, unused:true, node:true */
/*global describe:true, it:true, before:false */
'use strict';

var testRequire = require('./../test-require');
var fixtureLoader = require('../test-fixtures');

var contactService = testRequire('./services/contact-service');
var persistence = testRequire('./services/persistence-service');

var assert = require('assert');

var googleJSON = {
  version: '1.0',
  encoding: 'UTF-8',
  feed: {
    xmlns: 'http://www.w3.org/2005/Atom',
    'xmlns$openSearch': 'http://a9.com/-/spec/opensearchrss/1.0/',
    'xmlns$gContact': 'http://schemas.google.com/contact/2008',
    'xmlns$batch': 'http://schemas.google.com/gdata/batch',
    'xmlns$gd': 'http://schemas.google.com/g/2005',
    id: { '$t': 'hackers.are.rockstars@gmail.com' },
    updated: { '$t': '2013-07-30T15:48:41.495Z' },
    category: [ [Object] ],
    title: { type: 'text', '$t': 'Mauro Pompilio\'s Contacts' },
    link: [ [Object], [Object], [Object], [Object], [Object] ],
    author: [ [Object] ],
    generator:
     { version: '1.0',
       uri: 'http://www.google.com/m8/feeds',
       '$t': 'Contacts' },
    'openSearch$totalResults': { '$t': '300' },
    'openSearch$startIndex': { '$t': '1' },
    'openSearch$itemsPerPage': { '$t': '500' },
    entry: [
      { id: { '$t': 'http://www.google.com/m8/feeds/contacts/hackers.are.rockstars%40gmail.com/base/0' },
        updated: { '$t': '2013-05-15T05:32:20.322Z' },
        category:
         [ { scheme: 'http://schemas.google.com/g/2005#kind',
             term: 'http://schemas.google.com/contact/2008#contact' } ],
        title: { type: 'text', '$t': 'Mauro Pompilio' },
        link:
         [ { rel: 'http://schemas.google.com/contacts/2008/rel#edit-photo',
             type: 'image/*',
             href: 'https://www.google.com/m8/feeds/photos/media/hackers.are.rockstars%40gmail.com/0/H2VmUY0WMqDEEDZhuTtEmQ' },
           { rel: 'http://schemas.google.com/contacts/2008/rel#photo',
             type: 'image/*',
             href: 'https://www.google.com/m8/feeds/photos/media/hackers.are.rockstars%40gmail.com/0' },
           { rel: 'self',
             type: 'application/atom+xml',
             href: 'https://www.google.com/m8/feeds/contacts/hackers.are.rockstars%40gmail.com/full/0' },
           { rel: 'edit',
             type: 'application/atom+xml',
             href: 'https://www.google.com/m8/feeds/contacts/hackers.are.rockstars%40gmail.com/full/0/1368595940322001' } ],
        'gd$email':
         [ { rel: 'http://schemas.google.com/g/2005#other',
             address: 'hackers.are.rockstars@gmail.com',
             primary: 'true' } ] }
      ]
  }
};

describe('Contact Service', function() {

  describe('Data ingestion', function() {
    var fixture = {};

    before(fixtureLoader(fixture, { user1: { } }));

    it('should process Google JSON properly', function(done) {
      var user = fixture.user1;
      contactService.ingestGoogleContacts(user, googleJSON, function() {
        persistence.Contact.find({'userId': user.id}).exec(function(err, contacts) {
          if(err) return done(err);
          assert(contacts[0].emails[0] == 'hackers.are.rockstars@gmail.com', 'Failed to import.');
          done();
        });
      });
    });

    after(function() {
      fixture.cleanup();
    });

  });


  describe('Contact search', function() {
    var fixture = {};

    before(fixtureLoader(fixture, {
      contact1: {
        user: 'user1',
        name: 'Mauro Pompilio',
        emails: ['hackers.are.rockstars@gmail.com'],
        source: 'google'
      },
      user1: {}
    }));

    it('should find a user by name', function(done) {
      var user = fixture.user1;
      contactService.find(user, 'mau', function(err, matches) {
        if(err) return done(err);

        assert(matches[0].displayName == fixture.contact1.name, "Can't match by name");
        done();
      });
    });

    it('should find a user by email', function(done) {
      var user = fixture.user1;
      contactService.find(user, 'hack', function(err, matches) {
        if(err) return done(err);

        assert(matches[0].displayName == fixture.contact1.name, "Can't match by email");
        done();
      });
    });

    after(function() {
      fixture.cleanup();
    });

  });
});
