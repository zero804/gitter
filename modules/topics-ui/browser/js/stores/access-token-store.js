const serverStore = (window.context.accessTokenStore || {});
const token = (serverStore.token || '');

/**
 * XXX: this is wrong. It needs to return an async promise to a token,
 * not a sync token. Otherwise native mobile clients (for example)
 * will fail as they're injected with their token post page load
 */
export const getAccessToken = () => token;
