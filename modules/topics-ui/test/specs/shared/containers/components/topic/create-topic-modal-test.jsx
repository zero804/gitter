import { equal } from 'assert';
import sinon from 'sinon';
import React from 'react';
import { shallow } from 'enzyme';
import CreateTopicModal from '../../../../../../shared/containers/components/topic/create-topic-modal.jsx';
import mockEvt from '../../../../../mocks/event';
import tags from '../../../../../mocks/mock-data/tags';
import categories from '../../../../../mocks/mock-data/categories';

describe('<CreateTopicModal/>', () => {

  let ActiveComponent;
  let Component;

  let wrapper;
  let activeWrapper;

  let submitHandle;
  let titleChangeHandle;
  let bodyChangeHandle;
  let tagChangeHandle;

  const newTopic = {
    title: '',
    body: '',
    categoryId: '1',
    tags: [],
  }

  beforeEach(() => {

    submitHandle = sinon.spy();
    titleChangeHandle = sinon.spy();
    bodyChangeHandle = sinon.spy();
    tagChangeHandle = sinon.spy();

    Component = (
      <CreateTopicModal
        newTopic={newTopic}
        tags={tags}
        categories={categories}
        active={false}
        onTitleChange={titleChangeHandle}
        onBodyChange={bodyChangeHandle}
        onSubmit={submitHandle}
        onTagsChange={tagChangeHandle}/>
    );

    ActiveComponent =  (
      <CreateTopicModal
        tags={tags}
        categories={categories}
        newTopic={newTopic}
        active={true}
        onTitleChange={titleChangeHandle}
        onBodyChange={bodyChangeHandle}
        onSubmit={submitHandle}
        onTagsChange={tagChangeHandle}/>
    );

    wrapper = shallow(Component);
    activeWrapper = shallow(ActiveComponent);

  });

  it('should render a modal', () => {
    equal(wrapper.find('Modal').length, 1);
  });

  it('should render a H1 component', () => {
    equal(wrapper.find('H1').length, 1);
  });

  it('should render a form element', () => {
    equal(wrapper.find('form').length, 1);
  });

  it('should render an input with a name of title', () => {
    equal(wrapper.find('Input').at(0).prop('name'), 'title');
  });

  it('should render a custom h1', () => {
    equal(wrapper.find('.create-topic__heading').length, 1);
  });

  it('should render the name input with a custom class', () => {
    equal(wrapper.find('.create-topic__input--name').length, 1);
  });

  it('should render the name input with the right placeholder', () => {
    equal(wrapper.find('Input').at(0).prop('placeholder'), 'Add title ...');
  });

  it('should render an Editor element', () => {
    equal(wrapper.find('Editor').length, 1);
  });

  it('should render the editor with a custom class', () => {
    equal(wrapper.find('.create-topic__editor--body').length, 1);
  });

  it('should render a control row', () => {
    equal(wrapper.find('.create-topic__control-row').length, 1);
  });

  it('should render a submit button', () => {
    equal(wrapper.find('.create-topic__submit').length, 1);
  });

  it('should render the editor with a name of body', () => {
    equal(wrapper.find('Editor').at(0).prop('name'), 'body');
  });

  it('should call onSubmit when submitted', () => {
    wrapper.find('form').at(0).simulate('submit', mockEvt);
    equal(submitHandle.callCount, 1);
  });

  it('should call onTitleChange when the input changes', () => {
    wrapper.find('Input').at(0).prop('onChange')();
    equal(titleChangeHandle.callCount, 1);
  });

  it('should call onBodyChange when the textarea changes', () => {
    wrapper.find('Editor').at(0).prop('onChange')();
    equal(bodyChangeHandle.callCount, 1);
  });

});
