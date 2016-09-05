import assert from 'assert';
import LiveCollection from '../../../browser/js/stores/live-collection';

let collection;
beforeEach(() => {
  collection = new LiveCollection();
});

describe('LiveCollection', () => {

  it('should use getContextModel to assign a context model', () => {
    const msg = 'LiveCollection failed to assign the right context model'
    const expected = collection.contextModel.toJSON();
    const result = collection.getContextModel().toJSON();
    assert.deepEqual(expected, result, msg);
  });

});
