"use strict";

var React = require('react');
var Container = require('../container.jsx');
var Panel = require('../panel.jsx');

module.exports = React.createClass({

  displayName: 'CategoryList',
  propTypes: {
    categories: React.PropTypes.array.isRequired
  },

  render(){

    const { categories } = this.props;

    return (
      <Container>
        <Panel>
          <ul className="category-list">{ categories.map(this.getChildCategory) }</ul>
        </Panel>
      </Container>
    );
  },

  getChildCategory(category, index){
    return (
      <li key={`forum-category-list-item-${index}`}>{ category }</li>
    );
  }

});
