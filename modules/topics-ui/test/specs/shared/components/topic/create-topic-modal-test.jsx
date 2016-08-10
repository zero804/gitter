"use strict";

import { equal } from 'assert';
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
    equal(wrapper.find('Modal').length, 1);
  });


  it('should render a form element', () => {
    equal(wrapper.find('form').length, 1);
  });

  it('should render an input with a name of title', () => {
    equal(wrapper.find('Input').at(0).prop('name'), 'title');
  });

});
