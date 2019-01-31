/*jshint unused:true, browser:true*/
define(['backbone', 'collections/users'], function(backbone, collectionLib) {
  function assert(condition, message) {
    if (!condition) {
      throw message || 'Assertion failed';
    }
  }

  function assertEquals(a, b) {
    if (a !== b) {
      throw a + ' does not equal ' + b;
    }
  }

  function assertArrayEquals(a, b) {
    assertEquals(a.toString(), b.toString());
  }

  function assertCollection(collection, expected) {
    var actual = collection.pluck('displayName');
    assertArrayEquals(actual, expected);
  }

  describe('roster collection', function() {
    it('should trim the users', function() {
      var users = [
        new backbone.Model({ displayName: 'A' }),
        new backbone.Model({ displayName: 'B' }),
        new backbone.Model({ displayName: 'C' })
      ];

      var collection = new backbone.Collection();
      var roster = new collectionLib.RosterCollection(null, { users: collection, limit: 2 });
      collection.add(users);

      assertCollection(roster, ['A', 'B']);
    });

    it('should sort by role', function() {
      var users = [
        new backbone.Model({ displayName: 'A' }),
        new backbone.Model({ displayName: 'B', role: 'contributor' }),
        new backbone.Model({ displayName: 'C', role: 'admin' })
      ];

      var collection = new backbone.Collection();
      var roster = new collectionLib.RosterCollection(null, { users: collection, limit: 5 });
      collection.add(users);

      assertCollection(roster, ['C', 'B', 'A']);
    });

    it('should sort by role and trim', function() {
      var users = [
        new backbone.Model({ displayName: 'A' }),
        new backbone.Model({ displayName: 'B', role: 'contributor' }),
        new backbone.Model({ displayName: 'C', role: 'admin' })
      ];

      var collection = new backbone.Collection();
      var roster = new collectionLib.RosterCollection(null, { users: collection, limit: 2 });
      collection.add(users);

      assertCollection(roster, ['C', 'B']);
    });

    it("should work with mike's weird case", function() {
      var users = [
        {
          id: '529f4686278f637b8bb75c54',
          username: 'mbtesting',
          displayName: 'mbtesting',
          url: '/mbtesting',
          avatarUrlSmall:
            'https://gravatar.com/avatar/ea9b0c6d63199a7912fd02d15dc37159?d=https%3A%2F%2Fidenticons.github.com%2F23c13ee84cc5e3a1ee1815224df023e6.png&r=x',
          avatarUrlMedium:
            'https://gravatar.com/avatar/ea9b0c6d63199a7912fd02d15dc37159?d=https%3A%2F%2Fidenticons.github.com%2F23c13ee84cc5e3a1ee1815224df023e6.png&r=x',
          online: false,
          v: 10
        },
        {
          id: '529dcd08278f637b8bb75c4a',
          username: 'mydigitalself',
          displayName: 'Mike Bartlett',
          url: '/mydigitalself',
          avatarUrlSmall:
            'https://gravatar.com/avatar/a8b4506ba466eecadc9f4c1b46d400d0?d=https%3A%2F%2Fidenticons.github.com%2F2b97120888b0a92d3a73b41740dfa69e.png&r=x',
          avatarUrlMedium:
            'https://gravatar.com/avatar/a8b4506ba466eecadc9f4c1b46d400d0?d=https%3A%2F%2Fidenticons.github.com%2F2b97120888b0a92d3a73b41740dfa69e.png&r=x',
          online: false,
          v: 12
        },
        {
          id: '52a1f72e278f637b8bb75c61',
          username: 'gittertestbot',
          displayName: 'gittertestbot',
          url: '/gittertestbot',
          avatarUrlSmall:
            'https://gravatar.com/avatar/8b3fc8add4af1af4f0b722e3ea30d7e5?d=https%3A%2F%2Fidenticons.github.com%2Ff62bdf161f058d279d14acb7d35981b6.png&r=x',
          avatarUrlMedium:
            'https://gravatar.com/avatar/8b3fc8add4af1af4f0b722e3ea30d7e5?d=https%3A%2F%2Fidenticons.github.com%2Ff62bdf161f058d279d14acb7d35981b6.png&r=x',
          online: false,
          v: 3
        }
      ];

      var collection = new backbone.Collection();
      var roster = new collectionLib.RosterCollection(null, { users: collection, limit: 2 });
      collection.add(users);

      assertCollection(roster, ['gittertestbot', 'mbtesting']);
    });
  });
});
