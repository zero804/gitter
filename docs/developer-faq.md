# FAQ

Frequently asked questions by developers.


## How do I access Gitter over my local network?

#### Update the config

Create `config/config.users-overrides.json` and copy/paste `config/config.dev.json` into your new config.

Adjust all of the `localhost` entries to your local IP in the following sections,

 - `web`
 - `cdn`
 - `webhooks`
 - `ws`
 - `embed`

---

Alternatively to copying the whole `config/config.dev.json` over you can just use the relevant parts,

```json
{
  "web": {
    "homeurl": "/",
    "domain": "192.168.1.135",
    "baseserver": "192.168.1.135",
    "baseport": "5000",
    "basepath": "http://192.168.1.135:5000",
    "apiBasePath": "http://192.168.1.135:5000/api",
    "badgeBaseUrl" : "http://192.168.1.135:4000"
  },
  "cdn": {
    "use": false,
    "hosts": [
      "192.168.1.135:5001"
    ]
  },
  "webhooks": {
    "basepath": "http://192.168.1.135:3001"
  },
  "ws": {
    "fayeUrl": "http://192.168.1.135:5000/bayeux"
  },
  "embed": {
    "basepath": "http://192.168.1.135:8061"
  }
}
```

#### Update the OAuth callbacks

The OAuth callbacks you created initially have a `localhost:5000` redirect URI
which will just 404 on a separate device when you try to sign in.

Recreate your secrets using your local network IP, see https://gitlab.com/gitlab-org/gitter/webapp#configure-service-secrets

Restart the server. You should now be able to access Gitter over your local IP from other devices
