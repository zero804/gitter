import assert from 'assert';
import { shallow } from 'enzyme';
import React from 'react';
import App from '../../../browser/js/app.jsx';
import mockRouter from '../../mocks/router';
import * as navConstants from '../../../shared/constants/navigation';

describe('App', function() {

  it('should set the right state when rendered with the forum route', function(){
    const wrapper = shallow(<App router={mockRouter} />);
    assert.equal(wrapper.state('route'), 'forum');
  });

  it('should render a ForumContainer when rendered with the forum route', function(){
    mockRouter.set({ route: 'forum' });
    const wrapper = shallow(<App router={mockRouter} />);
    assert.equal(wrapper.find('ForumContainer').length, 1);
  });

  it('should render a ForumContainer when rendered with the create-topic route', () => {
    mockRouter.set({ route: 'create-topic', createTopic: true });
    const wrapper = shallow(<App router={mockRouter} />);
    assert.equal(wrapper.find('ForumContainer').length, 1);
    assert.equal(wrapper.state('createTopic'), true);
  });

  it('should insure that createTopic is set to false when navigating to /topics from /create-topic', () => {
    mockRouter.set({ route: navConstants.CREATE_TOPIC_ROUTE, createTopic: true });
    let wrapper = shallow(<App router={mockRouter} />);
    assert.equal(wrapper.state('createTopic'), true);
    mockRouter.set({ route: navConstants.FORUM_ROUTE, createTopic: false });
    wrapper = shallow(<App router={mockRouter} />);
    assert.equal(wrapper.state('createTopic'), false);
  });

  it('should provide a newReplyStore when in the topic route', () => {
    mockRouter.set({ route: navConstants.TOPIC_ROUTE, topicId: '1' });
    let wrapper = shallow(<App router={mockRouter} />);
    assert(wrapper.state('newReplyStore'), 'App failed to create newTopicStore');
  });

});
