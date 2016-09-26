import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import CommentItem from '../../../../../../shared/containers/components/topic/comment-item.jsx';

describe('<CommentItem/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<CommentItem/>);
  });

  it('should render', () => {
    assert(wrapper.length);
  });

});
