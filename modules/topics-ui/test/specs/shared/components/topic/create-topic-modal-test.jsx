"use strict";

import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import CreateTopicModal from '../../../../../shared/components/topic/create-topic-modal.jsx';

describe('<CreateTopicModal/>', () => {

  let wrapper;
  let activeWrapper;

  beforeEach(() => {
    wrapper = shallow(<CreateTopicModal active={false}/>);
    activeWrapper = shallow(<CreateTopicModal active={true}/>);
  });

  it('should render a modal', () => {
    assert.equal(wrapper.find('Modal').length, 1);
  });

});
