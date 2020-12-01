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
    }
  ].forEach(meta => {
    it(meta.name, async () => {
      const newText = await transformGitterTextIntoMatrixMessage(meta.text);

      assert.strictEqual(newText, meta.expectedText);
    });
  });
});
