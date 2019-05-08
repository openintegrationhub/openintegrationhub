# iam-utils
Utils and middleware for OIH IAM service

This library provides an express middleware to validate the tokens issued by [OIH IAM](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/iam) service (Heimdal).

## Env variables

`process.env`
* `IAM_TOKEN`: Service-Account token which is authorized to introspect other tokens
* `INTROSPECT_TYPE`: `basic` or `oidc`. Default: basic
* `INTROSPECT_ENDPOINT_BASIC`: IAM endpoint for basic token introspection
* `INTROSPECT_ENDPOINT_OIDC`: IAM endpoint for OIDC token introspection
* `OIDC_CLIENT_ID`: Your client id for OIDC
* `OIDC_CLIENT_SECRET_`: Your client secret for OIDC


## Usage

You can either use the util method `getUserData` or the express `middleware`.

### `async getUserData({ token, introspectType? })`

*Returns* Promise

This method accepts a token and returns a promise, which either resolves with the decoded object or is rejected with an error.
It introspects the token with a given `introspectType` (or with default, if not set).


### `middleware(req, res, next)`

You can plug this express middleware into your application logic/router. It will check for an `authorization` header containing the `Bearer` token and call the `getUserData` method internally.
The successfully decoded payload will be saved in `req.user` object, e.g.:

```
{
  "sub": "5b16927286b7f569feb1fae4",
  "username": "admin@example.com",
  "role": "USER",
  "memberships": [],
  "permissions": []
}
```


### FAQ




