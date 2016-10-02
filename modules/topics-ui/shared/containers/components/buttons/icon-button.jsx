import React, { PropTypes } from 'react';
import classNames from 'classnames';
import {
  ICONS_LIKE,
  ICONS_LIKE_SELECTED,
} from '../../../constants/icons';

export default React.createClass({

  displayName: 'IconButton',
  propTypes: {
    children: PropTypes.node,
    type: PropTypes.oneOf([
      ICONS_LIKE,
    ]),
    onClick: PropTypes.func,
  },

  render(){
    const {children, type, onClick} = this.props;

    let className;
    if(type === ICONS_LIKE) {
      className = 'icon-button-like';
    }

    if(type === ICONS_LIKE_SELECTED) {
      className = 'icon-button-like-selected';
    }

    const compiledClassName = classNames('icon-button', className);

    return (
      <button
        onClick={onClick}
        className={compiledClassName}>
        {children}
      </button>
    );
  }

});
