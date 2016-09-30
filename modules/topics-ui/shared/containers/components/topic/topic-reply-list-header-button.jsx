import React, { PropTypes } from 'react';
import classNames from 'classnames';

export default React.createClass({

  displayName: 'TopicReplyListHeaderButton',
  propTypes: {
    className: PropTypes.string,
    onClick: PropTypes.func,
    active: PropTypes.bool,
    children: PropTypes.node
  },

  render(){
    const {active, className, children} = this.props;
    const buttonClassName = active ?
    'topic-reply-list-header__filter-button--active':
    'topic-reply-list-header__filter-button';

    const compiledClass = classNames(buttonClassName, className);
    return (
      <button
        className={compiledClass}
        onClick={this.onClick}>
        {children}
      </button>
    );
  },

  onClick(e){
    e.preventDefault();
    const {onClick} = this.props;
    if(!onClick) { return; }
    onClick();
  }

});
