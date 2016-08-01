"use strict";

var assert = require('assert');
var React = require('react');
var Container = require('../../../../shared/components/container.jsx');
var { shallow } = require('enzyme');

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
