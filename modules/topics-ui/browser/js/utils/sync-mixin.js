import apiClient from './api-client';
import syncMixinFactory from 'gitter-web-api-client/lib/sync-mixin-factory';

/**
 * Singleton Sync Mixin
 */
var SyncMixin = syncMixinFactory(apiClient);

export default SyncMixin;
