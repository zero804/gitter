var Backbone = require('backbone');
var assert = require('assert');
var log = require('utils/log');
var moment = require('moment');
var bc = require('utils/burst-calculator');
var chatModels = require('collections/chat');

var Message = Backbone.Model;
var Collection = Backbone.Collection;

function validateAgainstParse(collection) {
  var testData = collection.toJSON();
  var validationSet = bc.parse(collection);

  for (var i = 0; i < testData.length; i++) {
    var burstStart = testData[i].burstStart === validationSet[i].burstStart;
    var burstFinal = testData[i].burstFinal === validationSet[i].burstFinal;
    if (!burstStart || !burstFinal) {
      var a = testData[i];
      var b = validationSet[i];
      log(a.text, 'is different');
      log('ACTUAL:', 'burstStart:', a.burstStart, 'burstFinal:', a.burstFinal);
      log('EXPECTED:', 'burstStart:', b.burstStart, 'burstFinal:', b.burstFinal);
      visualize(collection);
      return false;
    }
  }

  return true;
}

function visualize(collection) {
  collection.each(function(m) {
    log(
      m.get('burstStart') ? '\u2022' : ' ',
      m.get('burstFinal') ? '\u25e6' : ' ',
      m.get('sent').format('h:mm:ss:SSS'),
      '-',
      m.get('fromUser').username,
      'said:',
      m.get('text')
    );
  });
}

describe('burst-calculator', function() {
  it('parse() single message', function() {
    var messages = [
      {
        text: 'A1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));
    assert(res.at(0).get('burstStart'), 'burstStart should be true');
  });

  it('parse() multiple messages same user', function() {
    var messages = [
      {
        text: '1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: '2',
        sent: moment().add('minutes', 3),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: '3',
        sent: moment().add('minutes', 4),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: '4',
        sent: moment().add('minutes', 5.1),
        fromUser: {
          username: 'A'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));
    assert(res.at(0).get('burstStart'), 'burstStart should be true');
    assert.equal(res.at(1).get('burstFinal'), false, 'burstFinal should be false');
    assert.equal(res.at(2).get('burstFinal'), true, 'burstFinal should be true');
    assert(res.at(3).get('burstStart'), 'burstStart should be true');
  });

  it('parse() simultaneous messages by 2 different users', function() {
    var messages = [
      {
        text: 'A1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'B1',
        sent: moment(),
        fromUser: {
          username: 'B'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));
    assert(
      res.at(0).get('burstStart') && res.at(0).get('burstFinal'),
      'burstStart && burstFinal should be true'
    );
    assert(res.at(1).get('burstStart'), 'burstStart should be true');
  });

  it('parse() multiple messages multiple users with simultaneous messages', function() {
    var messages = [
      {
        text: 'A1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A2',
        sent: moment().add('minutes', 0.1),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'B1',
        sent: moment().add('minutes', 0.2),
        fromUser: {
          username: 'B1'
        }
      },
      {
        text: 'A3',
        sent: moment().add('minutes', 0.3),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'C1',
        sent: moment().add('minutes', 0.3),
        fromUser: {
          username: 'C1'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));

    assert(res.at(0).get('burstStart'), 'burstStart && burstFinal should be true');
    assert(res.at(1).get('burstFinal'), 'burstFinal should be true');
    assert(
      res.at(2).get('burstStart') && res.at(2).get('burstFinal'),
      'burstStart && burstFinal should be true'
    );
    assert(
      res.at(3).get('burstStart') && res.at(3).get('burstFinal'),
      'burstStart && burstFinal should be true'
    );
    assert(res.at(4).get('burstStart'), 'burstStart should be true');
  });

  it('parse() multiple messages with `/me` in the middle', function() {
    var messages = [
      {
        text: 'A1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A2',
        sent: moment().add('minutes', 0.1),
        status: true,
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'B1',
        sent: moment().add('minutes', 0.12),
        fromUser: {
          username: 'B'
        }
      },
      {
        text: 'B2',
        sent: moment().add('minutes', 0.15),
        fromUser: {
          username: 'B'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));
    assert(
      res.at(0).get('burstStart') && res.at(0).get('burstFinal'),
      'burstStart && burstFinal should be true'
    );
    assert(
      res.at(1).get('burstStart') && res.at(1).get('burstFinal'),
      'burstStart && burstFinal should be true'
    );
    assert(res.at(2).get('burstStart'), 'burstStart should be true');
    assert.equal(res.at(3).get('burstStart'), false, 'burstStart should be false');
  });

  it('calc() empty collection, add a single message', function() {
    var res = new Collection([]);
    var model = new Message({
      text: 'A1',
      sent: moment(),
      fromUser: {
        username: 'A'
      }
    });

    res.add(model);
    bc.calc.call(res, model);
    assert(validateAgainstParse(res));
  });

  it('calc() pre-populated and parsed collection, adding at the bottom', function() {
    var messages = [
      {
        text: 'A1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A2',
        sent: moment().add('minutes', 3),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A3',
        sent: moment().add('minutes', 4),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A4',
        sent: moment().add('minutes', 5.1),
        fromUser: {
          username: 'A'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));
    res.comparator = 'sent';

    var model = new Message({
      text: '1',
      sent: moment().add('m', 5.2),
      fromUser: {
        username: 'B'
      }
    });
    res.add(model);
    bc.calc.call(res, model);

    assert(validateAgainstParse(res));
  });

  it('calc() pre-populated and parsed collection, adding at the top', function() {
    var messages = [
      {
        text: 'A1',
        sent: moment().add('minutes', 1),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A2',
        sent: moment().add('minutes', 3),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A3',
        sent: moment().add('minutes', 4),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A4',
        sent: moment().add('minutes', 5.1),
        fromUser: {
          username: 'A'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));
    res.comparator = 'sent';

    var b1 = new Message({
      text: 'B1',
      sent: moment(),
      fromUser: {
        username: 'B'
      }
    });

    var b2 = new Message({
      text: 'B2',
      sent: moment().add('m', 0.1),
      fromUser: {
        username: 'B'
      }
    });

    res.add(b1);
    bc.calc.call(res, b1);

    res.add(b2);
    bc.calc.call(res, b2);

    assert(validateAgainstParse(res));
  });

  it('calc() pre-populated and parsed collection, adding at the middle', function() {
    var messages = [
      {
        text: 'A1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A2',
        sent: moment().add('minutes', 3),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A3',
        sent: moment().add('minutes', 4),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'A4',
        sent: moment().add('minutes', 5.1),
        fromUser: {
          username: 'A'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));
    res.comparator = 'sent';

    var model = new Message({
      text: 'B1',
      sent: moment().add('m', 1),
      fromUser: {
        username: 'B'
      }
    });

    res.add(model);
    bc.calc.call(res, model);

    assert(validateAgainstParse(res));
  });

  it('calc() pre-populated and bombarding from 3 users', function(done) {
    var messages = [
      {
        text: 'PRE-POPULATED 1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'PRE-POPULATED 2',
        sent: moment().add('minutes', 0.1),
        status: true,
        fromUser: {
          username: 'A'
        }
      },
      {
        text: 'PRE-POPULATED 3',
        sent: moment().add('minutes', 0.12),
        fromUser: {
          username: 'B'
        }
      },
      {
        text: 'PRE-POPULATED 4',
        sent: moment().add('minutes', 0.15),
        fromUser: {
          username: 'B'
        }
      }
    ];

    var res = new Collection(bc.parse(messages));
    res.comparator = 'sent';

    res.on('add', function(m, c) {
      c.once('sort', function() {
        bc.calc.call(c, m);
        return;
      });
    });

    var count = 0;

    function sendMessage(user, delay) {
      var model = new Message({
        text: count,
        sent: moment().subtract('ms', delay),
        fromUser: {
          username: user
        }
      });
      this.add(model);
      count++;
    }

    var t1 = setInterval(sendMessage.bind(res, 'A'), 15);
    var t2 = setInterval(sendMessage.bind(res, 'B'), 23);
    var t3 = setInterval(sendMessage.bind(res, 'C'), 45);

    setTimeout(function() {
      clearInterval(t1);
      clearInterval(t2);
      clearInterval(t3);

      setTimeout(function() {
        // messages inserted at a random time after 300ms
        sendMessage.call(res, 'CRAZY INSERTION', ~~Math.random(1000));
        sendMessage.call(res, 'CRAZY_INSERTION', ~~Math.random(1000));
        sendMessage.call(res, 'CRAZY INSERTION', 512);
        sendMessage.call(res, 'CRAZY_INSERTION', 950);

        // TODO: TOGGLE IT FOR A LOG VISUALIZATION OF THE MESSAGES BURSTS AND SUCH
        assert(validateAgainstParse(res));

        done();
      }, 300);
    }, 1 * 1000);
  });

  it('handles data being set()', function() {
    var chatCollection = new chatModels.ChatCollection(null);

    chatCollection.set(
      [
        {
          id: '53bec5882085830000bf4b84',
          text: '1',
          html: '1',
          sent: '2014-07-10T16:55:36.319Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        },
        {
          id: '53bec5882085830000bf4b85',
          text: '2',
          html: '2',
          sent: '2014-07-10T16:55:36.707Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        },
        {
          id: '53bec5892085830000bf4b86',
          text: '3',
          html: '3',
          sent: '2014-07-10T16:55:37.087Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        },
        {
          id: '53bec5892085830000bf4b87',
          text: '4',
          html: '4',
          sent: '2014-07-10T16:55:37.474Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        },
        {
          id: '53bec58a2085830000bf4b88',
          text: '5',
          html: '5',
          sent: '2014-07-10T16:55:38.064Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        },
        {
          id: '53bec6ea2085830000bf4b89',
          text: '6',
          html: '6',
          sent: '2014-07-10T17:01:30.162Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        },
        {
          id: '53bec6ea2085830000bf4b8a',
          text: '7',
          html: '7',
          sent: '2014-07-10T17:01:30.563Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        },
        {
          id: '53bec6eb2085830000bf4b8b',
          text: '8',
          html: '8',
          sent: '2014-07-10T17:01:31.025Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        },
        {
          id: '53bec6eb2085830000bf4b8c',
          text: '9',
          html: '9',
          sent: '2014-07-10T17:01:31.877Z',
          editedAt: null,
          fromUser: {
            id: '53bec5764bf9c36505409389',
            username: 'trevorah',
            displayName: 'Andy Trevorah',
            url: '/trevorah',
            avatarUrlSmall: 'https://avatars.githubusercontent.com/u/298742?&s=32',
            avatarUrlMedium: 'https://avatars.githubusercontent.com/u/298742?&s=128'
          },
          unread: false,
          readBy: 0,
          urls: [],
          mentions: [],
          issues: [],
          meta: {},
          v: 1
        }
      ],
      { parse: true }
    );

    // TODO: TURN THIS ON TO VISUALIZE STUFF
    // visualize(chatCollection);
    assert(validateAgainstParse(chatCollection));
  });
});
