<script>
export const ACTIVE_TILL = new Date('2020-10-13T00:00:00.000Z');

export const isAnnouncementActive = () => new Date(Date.now()) < ACTIVE_TILL;

export default {
  name: 'AnnouncementsBody'
};
</script>

<template>
  <div class="announcements-body-root">
    <h2 class="announcements-body-title">Announcement</h2>
    <p>Hello,</p>
    <p>
      We are writing to you to inform you of some changes around the processing of your personal
      data by Gitter.
    </p>
    <p>
      On the 30th of September, the Gitter web app was acquired by
      <a href="https://element.io/" target="_blank">Element</a>
      (a trading name of New Vector Ltd.). This means that your personal data, and all associated
      information assets, has been transferred over to the new Controller of your data.
    </p>
    <p>
      We would like to provide you with the assurance that your data will remain within the same
      data centre and be processed in accordance with the General Data Protection Regulation. For
      full details please see our
      <a href="https://element.io/privacy" target="_blank">Privacy Policy</a>, which details,
      amongst other things:
    </p>
    <ul>
      <li>Our contact details;</li>
      <li>Our Data Protection Officer’s contact details;</li>
      <li>The purposes and legal basis of processing of your data;</li>
      <li>Applicable categories of personal data;</li>
      <li>Your rights in relation to your data;</li>
    </ul>
    <p>
      You are in full control of your information and if you would not like Element to retain your
      personal data please consult
      <a
        href="https://gitlab.com/gitterHQ/webapp/-/blob/develop/docs/accounts.md#how-do-i-delete-my-account"
        target="_blank"
        >these instructions</a
      >
      on how to delete your account. If you have any questions which cannot be answered by the links
      above, please do not hesitate to get in touch via dpo@element.io
    </p>
    <p>
      For more information on Gitter joining Element, please visit
      <a href="https://element.io/blog/gitter-is-joining-element/" target="_blank">our blog</a>.
    </p>
    <p>Kindest regards,</p>
    <p>Element</p>
  </div>
</template>

<style lang="less" scoped>
@import (reference) 'trp3Vars';
@import (reference) 'components/m-header-title';
@import (reference) 'dark-theme';

.announcements-body-root {
  padding: 10px;
  a {
    color: @blue;
  }
  .dark-theme & {
    color: @dark-theme-left-menu-text-color;
  }
}

.announcements-body-title {
  .m-header-title();
}
</style>
