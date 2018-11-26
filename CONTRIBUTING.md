# Contributing to Open Integration Hub
Contributions to the Open Integration Hub including code, documentation for all types of Open Integration Hub
contributors.

## [Code of Conduct](./CODE_OF_CONDUCT.md)

The Open Integration Hub project has a [**code of conduct**](https://github.com/openintegrationhub/openintegrationhub/blob/master/CODE_OF_CONDUCT.md) that follows the `Contributor Covenant Code of Conduct`.
All contributors are expected to follow this code of conduct.


## Issues

Issues in `openintegrationhub/openintegrationhub` are categorized in two types:

1. Bug Reports: To report a bug, please click on **New Issue**, select the **bug report** template and complete it
2. Open Tasks: To report an open task or feature request, please click on **New Issue**, select the **Custom Issue Template** and complete it
3. Discussions/Open Questions: To start a new discussion or to flag an open question that needs answering, please click on **New Issue**, select the **Discussion/Open Question Template** and complete it

### Definition Of Done

The definition of done for each issue:

- All acceptance criteria have been fulfilled
- Output published on GitHub under github.com/openintegrationhub

#### DoD Documents

In addition to the previously defined definition of done some rules only apply for outputs of type document:

- Workgroup consensus about output (has to be accepted) i.e. each teamlead approved the pull request
- All concepts must include information about the creator, last modifier and last modification date
- (Microservice)concept:
  - Have to be published under github.com/openintegrationhub/microservices
  - Services are described in a common form using the [microservice template](https://github.com/openintegrationhub/Microservices/blob/master/MicroserviceDescriptionTemplate.md)
  - All predefined section of the template are filled
- Architecture Concepts:
  - Have to be published under github.com/openintegrationhub/architecture
- Architecture Decisions:
  - Have to be published under github.com/openintegrationhub/architecture
  - Decisions are described in a common form using the [architecture decision template](https://github.com/openintegrationhub/Architecture/blob/master/Decisions/ArchitectureDecisionTemplate.md)
- Concept / document reviewed and accepted by CES quality manager 

#### DoD Code

In addition to the previously defined definition of done some rules only apply for outputs of type code:

- Workgroup consensus about functionality i.e. each teamlead approved the pull request
- Code is compliant with [styleguide](Guidelines/styleGuide.md)
- Code is compliant with [devops/operations guidelines](Guidelines/serviceOperations.md)
- Dependent documentation have been updated (See DoD for documents)
- New modules are defined in package.json
- All new features are tested in development mode (unit tests)
- Once we have integration tests:
  - Integration tests were successful applied
  - Dependencies between software modules are documented  
- The application is running in a test environment without critical bugs
- Services are up and running on K8s test instance

## Pull Requests

Pull Requests are the way concrete changes are made to the repository.

- Assign all development leads or the appropiate team lead to the pull request ([@drobiazko](https://github.com/drobiazko), [@sachmerz](https://github.com/sachmerz), [@hschmidthh](https://github.com/hschmidthh), [@philecs](https://github.com/philecs))
- If you don't know whom to assign, choose: [@philecs](https://github.com/philecs)
- Select an appropriate label (choose the dependent `service` and/or `framework`(e.g. Smart Data Framework) or if no current label fits choose `general`) 

<a id="developers-certificate-of-origin"></a>
