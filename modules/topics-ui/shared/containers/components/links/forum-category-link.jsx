import React, { PropTypes } from 'react';
import navigateToCategory from '../../../action-creators/forum/navigate-to-category';
import {dispatch} from '../../../dispatcher';
import { DEFAULT_CATEGORY_NAME } from '../../../constants/navigation';

export default React.createClass({

  displayName: 'ForumCategoryLink',
  propTypes: {
    children: PropTypes.node,
    groupUri: PropTypes.string.isRequired,
    category: PropTypes.shape({
      category: PropTypes.string.isRequired,
      slug: PropTypes.string.isRequired,
    }),
    onClick: PropTypes.func,
    className: PropTypes.string
  },

  render(){

    const {category, groupUri, className} = this.props;
    const { slug } = category;
    const title = `View all ${category.label || category.category} topics`;
    const href = (category.category === DEFAULT_CATEGORY_NAME) ?
      `/${groupUri}/topics` :
      `/${groupUri}/topics/categories/${slug}`;

    return (
      <a title={title} href={href} className={className} onClick={this.onClick}>
        {this.props.children || category.label || category.category}
      </a>
    );
  },

  onClick(e){
    e.preventDefault();
    const {onClick, category} = this.props;
    if(onClick) { return onClick(e, category); }
    dispatch(navigateToCategory(category.slug));
  }

});
