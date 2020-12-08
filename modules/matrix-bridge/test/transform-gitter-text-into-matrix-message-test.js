'use strict';

const assert = require('assert');
const transformGitterTextIntoMatrixMessage = require('../lib/transform-gitter-text-into-matrix-message');

describe('transform-gitter-text-into-matrix-message', () => {
  [
    {
      name: 'Leaves message alone if no emoji',
      text: `Heya over there`,
      expectedText: `Heya over there`
    },
    {
      name: 'Transforms :emoji: syntax to Unicode',
      text: `My emoji :smile:`,
      expectedText: `My emoji 😄`
    },
    {
      name: 'Transforms multiple :emoji: syntax to Unicode',
      text: `My emoji :smile: and :goat:`,
      expectedText: `My emoji 😄 and 🐐`
    },
    {
      name: 'Transforms :emoji: next to text (first/last character)',
      text: `:smile:prefix both:eyes:sides suffix:goat:`,
      expectedText: `😄prefix both:eyes:sides suffix🐐`
    },
    {
      name: 'Transforms :emoji: next to text',
      text: `first :smile:prefix both:eyes:sides suffix:goat: last`,
      expectedText: `first 😄prefix both:eyes:sides suffix:goat: last`
    },
    {
      name: 'Leaves unknown :emoji: syntax alone',
      text: `My unknown emoji :feelsgood:`,
      expectedText: `My unknown emoji :feelsgood:`
    },
    {
      name: 'Strips mention off of status(/me) message (text)',
      text: `@MadLittleMods hi`,
      expectedText: `hi`,
      messageOverrides: {
        status: true
      }
    },
    {
      name: 'Strips mention off of status(/me) message (html)',
      text: `<span data-link-type="mention" data-screen-name="MadLittleMods" class="mention">@MadLittleMods</span> hi`,
      expectedText: `hi`,
      messageOverrides: {
        status: true
      }
    },
    {
      name:
        'Make sure replacement is not greedy and only strips the first mention off of status(/me) message (text)',
      text: `@MadLittleMods says hi to @bob`,
      expectedText: `says hi to @bob`,
      messageOverrides: {
        status: true
      }
    },
    {
      name:
        'Make sure replacement is not greedyand only strips the first mention off of status(/me) message (html)',
      text: `<span data-link-type="mention" data-screen-name="MadLittleMods" class="mention">@MadLittleMods</span> says hi to <span data-link-type="mention" data-screen-name="bob" class="mention">@bob</span>`,
      expectedText: `says hi to <span data-link-type="mention" data-screen-name="bob" class="mention">@bob</span>`,
      messageOverrides: {
        status: true
      }
    }
  ].forEach(meta => {
    it(meta.name, async () => {
      let message = {
        ...(meta.messageOverrides || {})
      };
      const newText = await transformGitterTextIntoMatrixMessage(meta.text, message);

      assert.strictEqual(newText, meta.expectedText);
    });
  });
});
