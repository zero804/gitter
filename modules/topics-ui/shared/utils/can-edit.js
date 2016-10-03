const defaultForum = {
  permissions: {
    admin: false
  }
}

const defaultUser = {
  id: false
}

const defaultResource = {
  user: {}
}


export default function canEdit(forum, user, resource = defaultResource){

  forum = (forum || defaultForum);
  user = (user || defaultUser);

  //User is admin
  const permissions = (forum.permissions || {});
  if(permissions.admin) { return true; }

  //User owns resource
  const {id} = user;
  const resourceOwnerId = resource && resource.user && resource.user.id;
  if(id === resourceOwnerId) { return true;}

  return false;
}
