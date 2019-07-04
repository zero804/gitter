// This file bootstraps any Vue code that is on the page

const createStore = require('./store').default;
const renderLeftMenu = require('./left-menu').default;
const renderThreadMessageFeed = require('./thread-message-feed').default;
const setupDataBridge = require('./store/data-bridge').default;

const store = createStore();

// We initialize the store state with the data injected from the server
// This comes from `context.renderState()`
if (window.__INITIAL_STATE__) {
  store.replaceState(window.__INITIAL_STATE__);
  delete window.__INITIAL_STATE__;
}

setupDataBridge(store);

const leftMenuRootEl = document.querySelector('.js-left-menu-root');
if (leftMenuRootEl) {
  renderLeftMenu(leftMenuRootEl, store);
}

const threadMessageFeedRootEl = document.querySelector('.js-thread-message-feed-root');
if (threadMessageFeedRootEl) {
  renderThreadMessageFeed(threadMessageFeedRootEl, store);
}
