import React from 'react';
import Container from '../container.jsx';
import Panel from '../panel.jsx';
import CategoryListItem from './category-list-item.jsx';

export default React.createClass({

  displayName: 'CategoryList',
  propTypes: {
    categories: React.PropTypes.array.isRequired,
    onCategoryClicked: React.PropTypes.func.isRequired,
    groupName: React.PropTypes.string.isRequired
  },

  render(){

    const { categories } = this.props;

    return (
      <Container className="container--category">
        <Panel className="panel--category">
          <nav>
            <ul className="category-list">{ categories.map(this.getChildCategory) }</ul>
          </nav>
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
