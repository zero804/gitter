"use strict";

var React = require('react');
var Container = require('../container.jsx');
var Panel = require('../panel.jsx');
var CategoryListItem = require('./category-list-item.jsx');


module.exports = React.createClass({

  displayName: 'CategoryList',
  propTypes: {
    categories: React.PropTypes.array.isRequired,
    onCategoryClicked: React.PropTypes.func.isRequired,
  },

  render(){

    const { categories } = this.props;

    return (
      <Container>
        <Panel className="panel--category">
          <ul className="category-list">{ categories.map(this.getChildCategory) }</ul>
        </Panel>
      </Container>
    );
  },

  getChildCategory(category, index){
    const { onCategoryClicked } = this.props;
    return (
      <li key={`forum-category-list-item-${index}`}>
        <CategoryListItem
          category={category}
          onClick={ () => onCategoryClicked(category) } />
      </li>
    );
  }

});
