import {equal} from 'assert';
import React from 'react';
import {spy} from 'sinon';
import { mount } from 'enzyme';
import TextTypeAhead from '../../../../../../shared/containers/components/forms/text-type-ahead.jsx';
import mockEvent from '../../../../../mocks/event';
import {ENTER_KEY, TAB_KEY, UP_KEY, DOWN_KEY} from '../../../../../../shared/constants/keys';

describe('<TextTypeAhead/>', () => {

  let wrapper;
  let changeHandle;
  const completions = ['test-1', 'test-2', 'test-3'];

  beforeEach(() => {
    changeHandle = spy();
    wrapper = mount(
      <TextTypeAhead
        value=""
        name="test"
        onSubmit={changeHandle}
        completions={completions}/>
    );
  });

  it('should render an Input Component', () => {
    equal(wrapper.find('Input').length, 1);
  });

  it('should render a ul when the input has content', () => {
    equal(wrapper.find('ul').length, 0);
    wrapper.find('Input').at(0).prop('onChange')('test');
    equal(wrapper.find('ul').length, 1, 'failed to render the ul');
    equal(wrapper.find('li').length, completions.length, 'failed to render the li\'s');
  });

  it('should filter the list items based on the term', () => {
    wrapper.find('Input').at(0).prop('onChange')('1');
    equal(wrapper.find('li').length, 1, 'failed to render the li\'s');
  });

  it('should call onChange when TAB is pressed', () => {
    mockEvent.keyCode = DOWN_KEY;
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    mockEvent.keyCode = TAB_KEY;
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(changeHandle.callCount, 1);
  });

  it('should call onChange when ENTER is pressed', () => {
    mockEvent.keyCode = DOWN_KEY;
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    mockEvent.keyCode = ENTER_KEY;
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(changeHandle.callCount, 1);
  });

  it.skip('should call onChange when a type ahead item is clicked', () => {
    mockEvent.keyCode = DOWN_KEY;
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    wrapper.find('Input').at(0).prop('onChange')('test');
    wrapper.find('li').at(0).simulate('click', mockEvent);
    equal(changeHandle.callCount, 1);
  });

  it('should cycle active classes through the completions when the down key is pressed', () => {
    wrapper.find('Input').at(0).prop('onChange')('test');
    mockEvent.keyCode = DOWN_KEY;
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(wrapper.find('li').at(0).prop('className'), 'type-ahead__child--active');
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(wrapper.find('li').at(1).prop('className'), 'type-ahead__child--active');
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(wrapper.find('li').at(2).prop('className'), 'type-ahead__child--active');
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(wrapper.find('li').at(0).prop('className'), 'type-ahead__child--active');
  });

  it('should cycle active classes through the completions backwards when the up key is pressed', () => {
    wrapper.find('Input').at(0).prop('onChange')('test');
    mockEvent.keyCode = UP_KEY;
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(wrapper.find('li').at(2).prop('className'), 'type-ahead__child--active');
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(wrapper.find('li').at(1).prop('className'), 'type-ahead__child--active');
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(wrapper.find('li').at(0).prop('className'), 'type-ahead__child--active');
    wrapper.find('.type-ahead-wrapper').simulate('keyDown', mockEvent);
    equal(wrapper.find('li').at(2).prop('className'), 'type-ahead__child--active');
  });


});
