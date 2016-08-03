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
    groupName: React.PropTypes.string.isRequired,
  },

  render(){

    const { categories } = this.props;

    return (
      <Container className="container--category">
        <Panel className="panel--category">
          <ul className="category-list">{ categories.map(this.getChildCategory) }</ul>
        </Panel>
      </Container>
    );
  },

  getChildCategory(model, index){
    const { onCategoryClicked, groupName } = this.props;
    return (
      <li key={`forum-category-list-item-${index}`}>
        <CategoryListItem
          category={model.category}
          active={model.active}
          groupName={groupName}
          onClick={ () => onCategoryClicked(model.category) } />
      </li>
    );
  }

});
