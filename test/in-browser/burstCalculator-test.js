/*jshint unused:true, browser:true*/
define([
  'backbone',
  'assert',
  'utils/momentWrapper',
  'utils/burstCalculator'
], function (Backbone, assert, moment, bc) {

  var Message = Backbone.Model;
  var Collection = Backbone.Collection;

  describe('burstCalculator', function () {

    it('parse() single message', function () {
      var messages = [{
        text: 'A1',
        sent: moment(),
        fromUser: {
          username: 'A'
        }
      }];

      var res = new Collection(bc.parse(messages));
      assert(res.at(0).get('burstStart'), 'burstStart should be true');
      assert.equal(res.at(0).get('burstFinal'), false, 'burstFinal should be false');
    });

    it('parse() multiple messages same user', function () {
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

    it('parse() simultaneous messages by 2 different users', function () {
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
      assert(res.at(0).get('burstStart') && res.at(0).get('burstFinal'), 'burstStart && burstFinal should be true');
      assert(res.at(1).get('burstStart'), 'burstStart should be true');
    });

    it('parse() multiple messages multiple users with simultaneous messages', function () {
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
      assert(res.at(2).get('burstStart') && res.at(2).get('burstFinal'), 'burstStart && burstFinal should be true');
      assert(res.at(3).get('burstStart') && res.at(3).get('burstFinal'), 'burstStart && burstFinal should be true');
      assert(res.at(4).get('burstStart'), 'burstStart should be true');
    });

    it('parse() multiple messages with `/me` in the middle', function () {

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
      assert(res.at(0).get('burstStart') && res.at(0).get('burstFinal'), 'burstStart && burstFinal should be true');
      assert(res.at(1).get('burstStart') && res.at(1).get('burstFinal'), 'burstStart && burstFinal should be true');
      assert(res.at(2).get('burstStart'), 'burstStart should be true');
      assert.equal(res.at(3).get('burstStart'), false, 'burstStart should be false');
    });

    it('calc() empty collection, add a single message', function () {
      var collection = new Collection([]);
      var model = new Message(
        { text: 'A1',
          sent: moment(),
          fromUser: {
            username: 'A'
          }
        });

      collection.add(model);
      bc.calc.call(collection, model);
      assert(model.get('burstStart'), 'burstStart should be true');
      assert.equal(model.get('burstFinal'), false, 'burstFinal should be false');
    });

    it('calc() pre-populated and parsed collection, adding at the bottom', function () {
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

      var model = new Message(
        { text: '1',
          sent: moment().add('m', 5.2),
          fromUser: {
            username: 'B'
          }
        });
      res.add(model);
      bc.calc.call(res, model);

      assert(model.get('burstStart'), 'burstStart should be true');
    });

    it('calc() pre-populated and parsed collection, adding at the top', function () {
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

      var b1 = new Message(
        { text: 'B1',
          sent: moment(),
          fromUser: {
            username: 'B'
          }
        });

      var b2 = new Message(
        { text: 'B2',
          sent: moment().add('m', 0.1),
          fromUser: {
            username: 'B'
          }
        });

      res.add(b1);
      bc.calc.call(res, b1);

      res.add(b2);
      bc.calc.call(res, b2);

      assert(b1.get('burstStart'), 'burstStart should be true');
      assert(b2.get('burstFinal'), 'burstStart && burstFinal should be true');
      assert(res.at(2).get('burstStart'), 'burstStart should be true');
    });

    it('calc() pre-populated and parsed collection, adding at the middle', function () {
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

      var model = new Message(
        { text: 'B1',
          sent: moment().add('m', 1),
          fromUser: {
            username: 'B'
          }
        });

      res.add(model);
      bc.calc.call(res, model);

      assert(res.at(0).get('burstStart') && res.at(0).get('burstFinal'), 'burstStart && burstFinal should be true');
      assert(model.get('burstStart') && model.get('burstFinal'), 'burstStart && burstFinal should be true');
      assert(res.at(1).get('burstStart'), 'burstStart should be true');
    });
  });
});
