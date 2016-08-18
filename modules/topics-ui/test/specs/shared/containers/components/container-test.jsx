import assert from 'assert';
import React from 'react';
import Container from '../../../../../shared/containers/components/container.jsx';
import { shallow } from 'enzyme';

describe('<Container />', function(){

  it('should wrap its children in a container div', function(){
    var wrapper = shallow(<Container />);
    assert.equal(wrapper.find('.container').length, 1);
  });


  it('should render its children', function(){
    var wrapper = shallow(
      <Container>
        <section className="test" />
        <section className="test" />
        <section className="test" />
      </Container>
    );

    assert.equal(wrapper.find('.test').length, 3);
  });

  it('should compound classnames', function(){
    var wrapper = shallow(<Container className="test" />);
    assert.equal(wrapper.find('.test').length, 1);
  });

});
