import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import IconButton from '../../../../../../shared/containers/components/buttons/icon-button.jsx';

describe('<IconButton/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<IconButton/>);
  });

  it('should fail a test because you should write some', () => {
    assert(false, 'Srsly, write some tests');
  });

});
