const assert = require('assert').strict;

const COMMANDS = {
    ABORT_FLOW: 'ABORT_FLOW',
    FINISH_FLOW: 'FINISH_FLOW',
    START_FLOW: 'START_FLOW',
    EXECUTE_NODE: 'EXECUTE_NODE',
    GOTO_NEXT: 'GOTO_NEXT',
    EXECUTE_NODES: 'EXECUTE_NODES',
}

const BRANCH_LOGIC = {
    SWITCH: 'SWITCH',
    SPLIT: 'SPLIT',
    JOIN_ONE_OF: 'JOIN_ONE_OF',
    JOIN: 'JOIN',
}

const CONDITIONALS = {
    AND: 'AND',
    OR: 'OR',
}

const OPERATIONS = {
    CONTAINS: 'CONTAINS',
    EQUALS: 'EQUALS',
    IS_TRUTHY: 'IS_TRUTHY',
}

const TYPES = {
    CONDITION: 'CONDITION',
    BRANCHING: 'BRANCHING',
}


class Tester {

    assertEquals(a, b) {
        return assert.equal(a, b);
    }

    assertContains(a, b) {
        return assert.match(a, b);
    }

}


class EngineGoBroom {

    data = null;
    rule = null;

    constructor(rule, data) {

        this.data = data;
        this.rule = rule;

        this.asserter = new Tester();

        this.validateSchema(this.rule);
    }

    validateSchema(rule) {

        if (!rule.type || !TYPES[rule.type]) {
            throw new Error(`${rule.type} is not a valid type`);
        }

        const subtype = this.getSubTypeMapFromType(rule.type)[rule.subtype];
        if (!rule.subtype || !subtype) {
            throw new Error(`${rule.subtype} is not a valid subtype`);
        }

        if (!rule.actions) {
            throw new Error('Actions are missing');
        }

    }

    getSubTypeMapFromType(type) {
        switch(type) {

            case TYPES.CONDITION:
                return CONDITIONALS;
            case TYPES.BRANCHING:
                return BRANCH_LOGIC;
            default:
                return null;
        }
    }

    process() {

        let result;

        try {

            switch(this.rule.type) {

                case TYPES.CONDITION:
                    result = this.processConditional(this.rule.subtype, this.rule.operands);
                    break;

                default:
                    // TODO
                    throw new Error('Nothing to process');
            }
        } catch (e) {
            console.error('FAAAAIL', e);
        }

        return this.generateResponse(result);

    }

    generateResponse(outcomePositive) {
        if (outcomePositive) {
            return this.rule.actions.positive;
        }
        return this.rule.actions.negative;
    }

    /** Kudos to https://stackoverflow.com/a/43849204 */
    resolvePath(object, path, defaultValue) {
        return path
            .split(/[\.\[\]\'\"]/)
            .filter(p => p)
            .reduce((o, p) => o ? o[p] : defaultValue, object);
    }

    getInputObj(obj) {

        if (obj.type === 'ref') {
            return this.resolvePath(this.data, obj.data);
        }

        return obj.data;

    }


    applyOperation(operation, obj) {

        if (operation === OPERATIONS.EQUALS) {
            this.asserter.assertEquals(this.getInputObj(obj.key), this.getInputObj(obj.value));
        }

        if (operation === OPERATIONS.CONTAINS) {
            this.asserter.assertContains(this.getInputObj(obj.key), this.getInputObj(obj.value));
        }

        return true;

    }

    processConditionalAND(operands) {

        let processed = 0;

        for (const operand of operands) {
            if (!this.applyOperation(operand.operation, operand)) {
                return false;
            }
            processed += 1;
        }

        return operands.length === processed;

    }

    processConditionalOR(operands) {

        for (const operand of operands) {
            if (this.applyOperation(operand.operation, operand)) {
                return true;
            }
        }

        return false;
    }

    processConditional(subtype, operands) {

        if (subtype === CONDITIONALS.AND) {
            return this.processConditionalAND(operands);
        }
        if (subtype === CONDITIONALS.OR) {
            return this.processConditionalOR(operands);
        }

    }
}

module.exports = {
    EngineGoBroom,
    COMMANDS,
    TYPES,
    OPERATIONS,
    CONDITIONALS,
    BRANCH_LOGIC,
}
