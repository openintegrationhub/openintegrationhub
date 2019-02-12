# iam-utils
Utils and middleware for OIH IAM service

This library provides an express middleware to validate a JWT issued by OIH IAM service (Heimdal).
It uses the https://github.com/auth0/node-jsonwebtoken and https://github.com/auth0/node-jwks-rsa libraries from [Auth0](https://github.com/auth0) under the hood.


## Env variables

`process.env`
* `IAM_JWT_ISSUER`: JWT issuer (e.g. 'https://www.example.com')
* `IAM_JWT_AUDIENCE`: JWT audience (e.g. 'example.com')
* `IAM_JWT_HMAC_SECRET`: HMAC shared secret (e.g. 'you5ecr3tString!')
* `IAM_BASE_URL`: Base uri of [OIH IAM](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/iam)
* `IAM_`: JWKS uri. [OIH IAM](https://github.com/openintegrationhub/openintegrationhub/tree/master/services/iam) exposes the supported/used certificates via '${OIH_BASE_URL}/.well-known/jwks.json'


## Usage

You can either use the util method `verify` or the express `middleware`.

### `async verify(token)`

*Returns* Promise

This method accepts a token and returns a promise, which either resolves with the decoded object or is rejected with an error.
It inspects the token header for the `alg` (algorithm) used. In case of a HMAC (e.g. HS256) the signature will be validated with the given *process.env.IAM_JWT_HMAC_SECRET*.
For RSA (e.g. RS256), the *process.env.IAM_JWKS_URI* endpoint will be called to fetch and cache the keys. This module used the `kid` from the token, to fetch the correct public key used for signing the request.


### `middleware(req, res, next)`

You can plug this express middleware into your application logic/router. It will check for an `authorization` header containing the `Bearer` token and call the `verify(token)` method internally.
The successfully decoded payload will be saved in `req.user` object, e.g.:

```
{
  "sub": "5b16927286b7f569feb1fae4",
  "username": "admin@example.com",
  "role": "USER",
  "memberships": [],
  "iat": 1531315824,
  "exp": 1531326624,
  "aud": "example.com",
  "iss": "https://www.example.com"
}
```


### FAQ

Make sure you use correct audience, issuer, as well as shared secret and/or jwks uri.




