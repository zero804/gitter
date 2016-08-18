import { equal } from 'assert';
import React from 'react';
import { shallow } from 'enzyme';
import CreateTopicModal from '../../../../../../shared/containers/components/topic/create-topic-modal.jsx';

describe.only('<CreateTopicModal/>', () => {

  let wrapper;
  let activeWrapper;

  beforeEach(() => {
    wrapper = shallow(<CreateTopicModal active={false}/>);
    activeWrapper = shallow(<CreateTopicModal active={true}/>);
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
    wrapper.find('form').at(0).simulate('submit', 'this is the news');
  });

});
