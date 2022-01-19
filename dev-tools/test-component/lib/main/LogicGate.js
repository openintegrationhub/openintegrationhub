const assert = require('assert').strict

const COMMANDS = {
  ABORT_FLOW: 'abort',
  FINISH_FLOW: 'finish',
  START_FLOW: 'start-flow',
  EXECUTE_NEXT: 'run-next',
  EXECUTE_NODES: 'run-next-steps',
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

const Asserter = {
  assertEquals: (a, b) => assert.equal(a, b),

  assertContains: (a, b) => assert.match(a, b),
}

class LogicGateway {
  constructor({ rule, snapshotData }) {
    this.data = snapshotData
    this.rule = rule

    this.asserter = Asserter

    LogicGateway.validateSchema(this.rule)
  }

  static validateSchema(rule) {
    if (!rule.type || !TYPES[rule.type]) {
      throw new Error(`${rule.type} is not a valid type`)
    }

    const subtype = LogicGateway.getSubTypeMapFromType(rule.type)[rule.subtype]
    if (!rule.subtype || !subtype) {
      throw new Error(`${rule.subtype} is not a valid subtype`)
    }

    if (TYPES[rule.type] === TYPES.BRANCHING) {
      if (!rule.default || !rule.default.action) {
        throw new Error('Branch default action is missing')
      }
    } else if (!rule.actions) {
      throw new Error('Actions are missing')
    }
  }

  static getSubTypeMapFromType(type) {
    switch (type) {
      case TYPES.CONDITION:
        return CONDITIONALS
      case TYPES.BRANCHING:
        return BRANCH_LOGIC
      default:
        return null
    }
  }

  processBranching(subtype, options) {
    let actionResponse = null

    if (subtype === BRANCH_LOGIC.SWITCH) {
      // eslint-disable-next-line no-restricted-syntax
      for (const subBranch of options) {
        const result = this.processConditional(
          subBranch.subtype,
          subBranch.operands
        )
        if (result) {
          actionResponse = subBranch.action
          break
        }
      }
    }

    if (!actionResponse) {
      actionResponse = this.rule.default.action
    }

    return actionResponse
  }

  process() {
    let result
    let actionResult

    try {
      switch (this.rule.type) {
        case TYPES.CONDITION:
          result = this.processConditional(
            this.rule.subtype,
            this.rule.operands
          )
          break
        case TYPES.BRANCHING:
          actionResult = this.processBranching(
            this.rule.subtype,
            this.rule.options
          )
          break

        default:
          // TODO
          return new Error('Nothing to process')
      }
    } catch (e) {
      console.error('Failed to process logic', e)
    }

    return actionResult || this.generateResponse(result)
  }

  generateResponse(outcomePositive) {
    if (outcomePositive) {
      return this.rule.actions.positive
    }
    return this.rule.actions.negative
  }

  static resolvePath(snapshotData, pathData, defaultValue) {
    const step = snapshotData.find((entry) => entry.stepId === pathData.stepId)
    if (!step || !step.snapshot) {
      console.error('Step data', step, pathData.stepId)
      return new Error(
        `Step not found or snapshot data missing:${pathData.stepId}`
      )
    }

    /** Kudos to https://stackoverflow.com/a/43849204 */
    return (
      pathData.field
        // eslint-disable-next-line no-useless-escape
        .split(/[.\[\]'"]/)
        .filter((p) => p)
        .reduce((o, p) => (o ? o[p] : defaultValue), step.snapshot)
    )
  }

  getInputObj(obj) {
    if (obj.type === 'ref') {
      return LogicGateway.resolvePath(this.data, obj.data)
    }
    if (obj.type === 'regex') {
      return new RegExp(obj.data.value, obj.data.flags || '')
    }

    return obj.data
  }

  applyOperation(operation, obj) {
    try {
      if (operation === OPERATIONS.EQUALS) {
        this.asserter.assertEquals(
          this.getInputObj(obj.key),
          this.getInputObj(obj.value)
        )
      }

      if (operation === OPERATIONS.CONTAINS) {
        this.asserter.assertContains(
          this.getInputObj(obj.key),
          this.getInputObj(obj.value)
        )
      }
    } catch (e) {
      return false
    }

    return true
  }

  processConditionalAND(operands) {
    let processed = 0

    // eslint-disable-next-line no-restricted-syntax
    for (const operand of operands) {
      if (!this.applyOperation(operand.operation, operand)) {
        return false
      }
      processed += 1
    }

    return operands.length === processed
  }

  processConditionalOR(operands) {
    // eslint-disable-next-line no-restricted-syntax
    for (const operand of operands) {
      if (this.applyOperation(operand.operation, operand)) {
        return true
      }
    }

    return false
  }

  processConditional(subtype, operands) {
    if (subtype === CONDITIONALS.AND) {
      return this.processConditionalAND(operands)
    }
    if (subtype === CONDITIONALS.OR) {
      return this.processConditionalOR(operands)
    }
    return new Error(`Unknown conditional operation ${subtype}`)
  }
}

module.exports = {
  LogicGateway,
  COMMANDS,
  TYPES,
  OPERATIONS,
  CONDITIONALS,
  BRANCH_LOGIC,
}
