const { expect } = require('chai');
const { transform } = require('../../lib/transformer');

describe('Transformer', () => {
    const person = {
        first_name: 'John',
        last_name: 'Doe',
        prefix: 'Dr.'
    };

    function defaultTransform(object) {
        const newObject = {
            firstName: object.first_name,
            lastName: object.last_name,
            title: object.prefix
        };
        return newObject;
    }

    it('should skip transform if directed', () => {
        const cfg = {
            skipTransformation: true
        };

        const result = transform(person, cfg, defaultTransform);

        expect(result).to.deep.equal(person);
    });

    it('should apply custom mapping if supplied', () => {
        const cfg = {
            customMapping: '{"fullName": prefix & " " & first_name & " " & last_name}'
        };

        const result = transform(person, cfg, defaultTransform);

        expect(result.fullName).to.equal('Dr. John Doe');
    });

    it('should apply default mapping if nothing else is required', () => {
        const cfg = {};

        const result = transform(person, cfg, defaultTransform);

        expect(result.firstName).to.equal('John');
        expect(result.lastName).to.equal('Doe');
        expect(result.title).to.equal('Dr.');
    });
});
