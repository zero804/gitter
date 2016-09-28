import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import ReactionButton from '../../../../shared/componentsforumreaction-button.jsx';

describe('<ReactionButton/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<ReactionButton/>);
  });

  it('should fail a test because you should write some', () => {
    assert(false, 'Srsly, write some tests');
  });

});
