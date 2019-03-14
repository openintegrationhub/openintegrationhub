# Authentication/Authorisation handling in Microservice Environment #


## Authorisation ##


#### [Oauth2](https://aaronparecki.com/oauth-2-simplified/)  
Authentication Service generates Tokens and can also validate them.  


**Pros**:  
* One Service to do all the authorization related work (no shared keys between services or Persistence)

**Cons**:  
* Single Point of failure
* Higher Network Traffic load for communication

---

#### [Oauth2 with JWT](https://jwt.io/introduction/)  
Authentication Service generates Tokens (example: JWT)  and the validation is done by each service.  

**Pros**:   
* Split workload and reduce Network Traffic  

**Cons**: 
* There is a shared Lib and a shared Secret which needs to be maintained.
* A non-backwards compatible change may require restarting all affected services.


## Authentication ##

#### [OpenID Connect](http://openid.net/connect/)  
Protocol Suite for Authentication & SSO based on OAuth2.0  

**Pros**:
* Small payload, highly optimised for WEB applications

**Cons**:
* Authorisation is handeled by OAuth2.0 (you need OpenID Connect and OAuth2.0)


## Authorisation & Authentication ##


#### [SAMl2.0](http://saml.xml.org/saml-specifications)  
XML based Standard for exchange Authentication & Authorisation Data, to archive Single Sign On (SSO), Federation and Identity Management  

**Pros**:
* Data transfer is free to use (SOAP, HTTP, JMS ...)
* Combine both Authentication and Authorisation

**Cons**:
* XML payload (assertions) very big

## Usecases and Findings ##


### Authentication and Authorisation from enduser  

* That case is not a part from OIH because only APIs are communicating

### Authorisation from APIs

* It is common practice to use OAuth2.0 in combination with JWT 

## Link Collection

[Modern Authentication flows](https://nordicapis.com/how-to-control-user-identity-within-microservices/)  
[Kubernetes how too Authenticate](https://medium.com/jeroen-rosenberg/from-monolith-to-microservice-architecture-on-kubernetes-part-2-authentication-with-jwt-934ea030923)  
[Differents between SAML & OpenID Connect](https://www.gluu.org/blog/oauth-vs-saml-vs-openid-connect/)  
[UMA user managed access](https://www.gluu.org/resources/documents/standards/uma/)

## Challenges

1.  The Type and or component to choose depends on what is more possible to achieve. implementation of needed features or managing a 3rd Party Software. 
