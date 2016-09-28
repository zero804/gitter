import assert from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import CommentEditor from '../../../../../../shared/containers/components/topic/comment-editor.jsx';

describe('<CommentEditor/>', () => {

  let wrapper;

  beforeEach(() => {
    wrapper = shallow(<CommentEditor/>);
  });

  it('render a custom class', () => {
    const className = wrapper.find('Editor').at(0).prop('className');
    assert.equal(className, 'reply-comment-editor')
  });

});
