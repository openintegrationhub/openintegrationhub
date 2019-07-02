# Status

accepted : alternative 1

# Context

As soon as we are building, deploying services we need integration tests to make sure services/flows are working seamlessly together

## Alternative 1: JEST

Stats (12.11.2018)

- Github: 3,784 commits, 142 releases, 838 contributors, 468 issues
- npm downloads: 22mio (2017) -> 64mio (2018), g ≈ 1.9 p.a.

### pro

- open source
- faster/easier than mocha because built-in mocking/assertion/spy/mocking libraries --> works out of the box!
- runs tests concurrently
- generate code coverage reports
- already used for OIH IAM & SKM
- fast growing user base

### contra

- less configuration possibilities than mocha
- less docu/community (mocha is more mature)

### Consequences

## Alternative 2: MOCHA

Stats (12.11.2018)

- Github: 2,994 commits, 142 releases, 389 contributors, 255 issues
- npm downloads: 67mio (2017) -> 79mio (2018), g ≈ 0,19 p.a.

### pro

- flexible and extendable with assertion
- mocking and spy libraries
- larger community 
- better documentation: more plugins/extensions for usage scenarios

### contra

- libraries need setup and configuration first
  - chai (as assertion lib)
  - Sinon (mocking)
  - spying etc

# Decision

- As discussed in the weekly backlog meeting (15.11.2018), we agreed on using Jest for the integration tests
