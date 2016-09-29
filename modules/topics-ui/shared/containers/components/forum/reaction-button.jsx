import React, { PropTypes } from 'react';
import RawReactionButton from './raw-reaction-button.jsx';

const reactionList = [
  { key: '+1', label: '👍' },
  { key: '-1', label: '👎' },
  { key: 'tada', label: '🎉' }
];

export default React.createClass({

  displayName: 'ReactionButton',
  propTypes: {
    className: PropTypes.string,
    children:  React.PropTypes.oneOfType([
      React.PropTypes.arrayOf(React.PropTypes.node),
      React.PropTypes.node
    ]),
    onReactionPick: PropTypes.func
  },

  getInitialState() {
    return {
      isPopoverVisible: false,
      // TODO: Remove. This is a dirty place-holder that flip-flops between reacting and not reacting
      // This will be supersceded by actual state whether the user already has a reaction of that type, etc
      tempIsAlreadyReacting: false
    };
  },

  render() {
    const { children, className } = this.props;
    const { isPopoverVisible } = this.state;

    return (
      <RawReactionButton
        className={className}
        children={children}
        reactionList={reactionList}
        isPopoverVisible={isPopoverVisible}
        onClick={this.onReactionButtonClick}
        onBlur={this.onBlur}
        onReactionPick={this.onReactionPick} />
    );
  },

  onReactionButtonClick(e) {
    this.setState({
      isPopoverVisible: !this.state.isPopoverVisible
    });
    e.preventDefault();
  },

  onBlur() {
    // Hide on blur
    this.setState({
      isPopoverVisible: false
    });
  },

  onReactionPick(reactionKey) {
    const { onReactionPick } = this.props;
    const { tempIsAlreadyReacting } = this.state;
    const newTempIsAlreadyReacting =  !tempIsAlreadyReacting;

    if(onReactionPick) {
      onReactionPick(reactionKey, newTempIsAlreadyReacting);
    }

    this.setState({
      // Hide on pick
      isPopoverVisible: false,
      // Update our dirty property to flip-flop next time
      tempIsAlreadyReacting: newTempIsAlreadyReacting
    });
  }

});
