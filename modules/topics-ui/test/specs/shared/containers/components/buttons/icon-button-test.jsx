import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import IconButton from '../../../../../../shared/containers/components/buttons/icon-button.jsx';

describe('<IconButton/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<IconButton/>);
  });

  it('should render', () => {
    assert(wrapper.length);
  });

});
