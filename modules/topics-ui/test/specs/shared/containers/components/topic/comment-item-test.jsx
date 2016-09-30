import { equal } from 'assert';
import React from 'react';
import { mount } from 'enzyme';
import CommentItem from '../../../../../../shared/containers/components/topic/comment-item.jsx';
import comments from '../../../../../mocks/mock-data/comments.js';

describe('<CommentItem/>', () => {

  let wrapper;
  const comment = comments[0];

  beforeEach(() => {
    wrapper = mount(
      <CommentItem comment={comment} />
    );
  });

  it('should render', () => {
    equal(wrapper.length, 1);
  });

  it('should render a ReactionButton', () => {
     equal(wrapper.find('ReactionButton').length, 1);
  });

});
