'use strict';

const UNAUTHORIZED_REDIRECT_MAP = {
  TOKEN_REVOKED_URL: '/login/token-revoked',
  LOGIN_URL: '/login'
};

module.exports = UNAUTHORIZED_REDIRECT_MAP;
