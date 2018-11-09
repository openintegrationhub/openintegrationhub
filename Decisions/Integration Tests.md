# Status
proposed

# Context

--> As soon as we are building, deploying services we need integration tests to make sure services/flows are working seamlessly together   

# Alternatives 1: JEST

### pro: open source, faster/easier because built-in mocking/assertion/spy/mocking libraries --> works out of the box!
### contra: less configuration possibilities than mocha, less docu/community (mocha is more mature)


# Alternative 2: MOCHA

### pro: flexible and extendable with assertion, mocking and spy libraries, larger community and better documentation: more plugins/extensions for usage scenarios
### contra: libraries need setup and configuration first: chai (as assertion lib), Sinon (mocking), spying etc

# Decision

--> For now, the proposed decision(by Hans, Dennis) is 'Jest' (outnumbers the benefits of mocha)

# Consequences

  - with Jest: none, its out of the box ready
  - with Mocha: its necessary to setup all needed functions first (assertion, stubbing, mocking, spying etc..) 

