# general

## docker

Since kubernetes is the agreed container managment framework, use docker images for runtimes.

## object oriented design principles (recommendation)

General best practices should be applied to software development.

* SOLID: <https://scotch.io/bar-talk/s-o-l-i-d-the-first-five-principles-of-object-oriented-design>
* DRY: <https://de.wikipedia.org/wiki/Don%E2%80%99t_repeat_yourself>

## test driven development (recommendation)

Use tdd (<https://en.wikipedia.org/wiki/Test-driven_development>)

## clean code / clean architecture (recommendation)

* <https://gist.github.com/ygrenzinger/14812a56b9221c9feca0b3621518635b#file-cleanarchitecture-md>
* <https://8thlight.com/blog/uncle-bob/2012/08/13/the-clean-architecture.html>

## javascript

### node.js docker

Use node.js docker images based on LTS version (currently node:carbon-alpine, node:carbon) instead of custom from scratch built containers.

* <https://hub.docker.com/_/node/>

### coding style

Use popular coding style to make the source code more intuitiv for other developers e.g. airbnb

* <https://github.com/airbnb/javascript>

### logging framework

Log should go to the standard output to be able to process it with container management. Use a logging framework to configure the logging detail  e.g. winston or bunyan

* <https://www.npmjs.com/package/winston>
* <https://www.npmjs.com/package/bunyan>

### linting

Use eslint to make code more consistent and avoiding bugs.

* <https://www.npmjs.com/package/eslint>
* editorconfig can be used to ensure consistent coding styles across different editors and IDEs. See <https://editorconfig.org/> for more information

### automated testing

Use automated unit testing with a code coverage of at least 80% e.g. Mocha/Chai

* <https://www.npmjs.com/package/mocha>
* <https://www.npmjs.com/package/chai>

### no fuzzy versions

Dependencies declared in package.json could use a fuzzy version markup that allows installed dependencies to be flexible at the cost of deterministic builds. This can be dangerous if one of the project’s dependencies also uses fuzzy versioning, when an incompatibility is introduced in a transient dependency.
Use fixed versions for all dependencies

### rest apis (recommendation)

If a service exposes a rest api, consider using a swagger api(json prefered) and the swagger-ui code generation tools to generate a server stub.

### http assertion (testing)

To test http requests the easy way, supertest allows to do so on a high abstraction level while still providing drop down access to the lower level API

* <https://github.com/visionmedia/supertest>
