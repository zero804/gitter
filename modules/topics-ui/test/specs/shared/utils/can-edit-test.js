import {ok} from 'assert';
import canEdit from '../../../../shared/utils/can-edit.js';

describe('canEdit', () => {

  const adminForum = { permissions: { admin: true } };
  const nonAdminForum = { permissions: { admin: false } };
  const user = { id: 1 };

  it('should return false by default', () => {
    ok(!canEdit());
  });

  it('should return true if the user is a forum admin', () => {
    ok(canEdit(adminForum));
  });

  it('should return true id the resource belongs to the user', () => {
    ok(canEdit(nonAdminForum, user, { user: user }));
  });

});
