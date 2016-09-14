const serverStore = (window.context.accessTokenStore || {});
const token = (serverStore.token || '');

export const getAccessToken = () => token;
