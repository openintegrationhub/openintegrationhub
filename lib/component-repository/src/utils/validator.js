function validate(collection) {
    const errors = [];

    // Check for missing required attributes and length using the mongoose validation
    const validateErrors = collection.validateSync();
    if (validateErrors) {
      const validateErrorsKeys = Object.keys(validateErrors.errors);
      for (let i = 0; i < validateErrorsKeys.length; i += 1) {
        if (
          !validateErrors.errors[validateErrorsKeys[i]].message.startsWith(
            'Validation failed',
          )
        ) {
          errors.push({
            message: validateErrors.errors[validateErrorsKeys[i]].message,
            code: 400,
          });
        }
      }
    }

    return errors;
  }

  module.exports = { validate };