import React, { PropTypes } from 'react';
import ReactDom from 'react-dom';
import classnames from 'classnames';
import {getDocument} from 'gitter-web-isomorphic-dom-utility';

const document = getDocument();

export default React.createClass({

  displayName: 'RawReactionButton',
  propTypes: {
    className: PropTypes.string,
    children:  React.PropTypes.oneOfType([
      PropTypes.arrayOf(React.PropTypes.node),
      PropTypes.node
    ]),
    reactionList: PropTypes.arrayOf(React.PropTypes.shape({
      key: PropTypes.string,
      label: PropTypes.string
    })),
    isPopoverVisible: PropTypes.bool,
    onClick: PropTypes.func,
    onBlur: PropTypes.func,
    onReactionPick: PropTypes.func
  },

  getDefaultProps() {
    return {
      className: 'reaction-button'
    };
  },

  render() {
    const { children, className, reactionList, isPopoverVisible } = this.props;

    const compiledPopoverClassNames = classnames({
      'reaction-popover': true,
      hidden: !isPopoverVisible
    })

    return (
      <div
        ref="reactionButtonWrapper"
        className="reaction-button-wrapper">
        <button
          className={className}
          onClick={this.onClick}
          onBlur={this.onBlur}>
          {children || ':D +'}
        </button>
        <div className={compiledPopoverClassNames}>
          <ul className="reaction-popover__reaction-list">
            {reactionList.map((reaction) => this.buildReactionListItem(reaction))}
          </ul>
        </div>
      </div>
    );
  },

  buildReactionListItem({ key, label }) {
    return (
      <li className="reaction-popover__reaction-list-item">
        <button
          key={key}
          className="reaction-popover__reaction-list-item-button"
          onClick={this.onReactionClick.bind(this, key)}
          onBlur={this.onBlur}>
          {label}
        </button>
      </li>
    );
  },


  onClick(e) {
    const { onClick } = this.props;
    if(onClick) {
      onClick(e);
    }
  },

  // Stay tuned to https://github.com/facebook/react/issues/6410
  onBlur(e) {
    const rootElement = ReactDom.findDOMNode(this.refs.reactionButtonWrapper);

    setTimeout(() => {
      if (!rootElement.contains(document && document.activeElement)) {
        const { onBlur } = this.props;
        if(onBlur) {
          onBlur(e);
        }
      }
    }, 0);
  },

  onReactionClick(reactionKey, e) {
    const { onReactionPick } = this.props;
    if(onReactionPick) {
      onReactionPick(reactionKey);
      e.preventDefault();
    }
  }

});
