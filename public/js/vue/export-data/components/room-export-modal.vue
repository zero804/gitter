<script>
import apiClient from '../../../components/api-client';
import appEvents from '../../../utils/appevents';
import ExportDataModal from './export-data-modal.vue';

export default {
  name: 'UserExportModal',
  components: {
    ExportDataModal
  },
  props: {
    roomId: {
      type: String,
      required: true
    }
  },
  computed: {
    exportBaseUrl() {
      return apiClient.web.uri(`/api_web/export/rooms/${this.roomId}`);
    }
  },
  methods: {
    onExitModal() {
      appEvents.trigger('destroy-export-room-data-view');
    }
  }
};
</script>

<template>
  <export-data-modal title="Export room data" @exitModal="onExitModal">
    <p class="export-rate-limit-note">
      Each export link is rate-limited to once every 3 hours. You will see a "429 - Too many
      requests" error once you reach the limit.
    </p>

    <ul class="export-link-list">
      <li>
        <a :href="`${exportBaseUrl}/messages.ndjson`" target="_blank">Messages</a>
      </li>
      <li>
        <a :href="`${exportBaseUrl}/users.ndjson`" target="_blank">Users</a>
      </li>
      <li>
        <a :href="`${exportBaseUrl}/integration-events.ndjson`" target="_blank"
          >Integration events</a
        >
      </li>
      <li>
        <a :href="`${exportBaseUrl}/bans.ndjson`" target="_blank">Bans</a>
      </li>
    </ul>
  </export-data-modal>
</template>
