const { ComponentReader } = require('../lib/component_reader.js');

describe('Component reader', () => {
  it('Should find component located on the path', () => {
    const reader = new ComponentReader();
    const promise = reader.init('/spec/component/');

    waitsFor(() => promise.isFulfilled() || promise.isRejected(), 10000);

    runs(() => {
      expect(promise.isFulfilled()).toEqual(true);
      expect(reader.componentJson.title).toEqual('Client component');
    });
  });

  it('Should find component trigger', () => {
    const reader = new ComponentReader();
    let filename;
    let error;
    reader.init('/spec/component/').then(() => {
      try {
        filename = reader.findTriggerOrAction('passthrough');
      } catch (err) {
        error = err;
      }
    });

    waitsFor(() => filename || error, 10000);

    runs(() => {
      expect(reader.componentJson.title).toEqual('Client component');
      expect(filename).toContain('triggers/passthrough.js');
    });
  });

  it('Should return error if trigger not found', () => {
    const reader = new ComponentReader();
    let filename;
    let error;

    reader.init('/spec/component/').then(() => {
      try {
        filename = reader.findTriggerOrAction('some-missing-component');
      } catch (err) {
        error = err;
      }
    });

    waitsFor(() => filename || error, 10000);

    runs(() => {
      expect(error.message).toEqual('Trigger or action "some-missing-component" is not found in component.json!');
    });
  });

  it('Should return appropriate error if trigger file is missing', () => {
    const reader = new ComponentReader();

    const promise = reader.init('/spec/component/')
      .then(() => reader.loadTriggerOrAction('missing_trigger'));

    waitsFor(() => promise.isFulfilled() || promise.isRejected(), 10000);

    runs(() => {
      expect(promise.isRejected()).toEqual(true);
      const err = promise.inspect().reason;
      expect(err.message).toMatch(
        // eslint-disable-next-line no-useless-escape
        /Failed to load file \'.\/triggers\/missing_trigger.js\': Cannot find module.+missing_trigger\.js/,
      );
      expect(err.code).toEqual('MODULE_NOT_FOUND');
    });
  });

  it('Should return appropriate error if missing dependency is required by module', () => {
    const reader = new ComponentReader();

    const promise = reader.init('/spec/component/')
      .then(() => reader.loadTriggerOrAction('trigger_with_wrong_dependency'));

    waitsFor(() => promise.isFulfilled() || promise.isRejected(), 10000);

    runs(() => {
      expect(promise.isRejected()).toEqual(true);
      const err = promise.inspect().reason;
      const { message } = err;
      const [errMessage] = message.split('\n');
      expect(errMessage).toEqual(
        'Failed to load file \'./triggers/trigger_with_wrong_dependency.js\': '
                + 'Cannot find module \'../not-found-dependency\'',
      );
      expect(err.code).toEqual('MODULE_NOT_FOUND');
    });
  });

  it('Should return appropriate error if trigger file is presented, but contains syntax error', () => {
    const reader = new ComponentReader();

    const promise = reader.init('/spec/component/')
      .then(() => reader.loadTriggerOrAction('syntax_error_trigger'));

    waitsFor(() => promise.isFulfilled() || promise.isRejected(), 10000);

    runs(() => {
      expect(promise.isRejected()).toEqual(true);
      const err = promise.inspect().reason;
      expect(err.message).toEqual(
        "Trigger or action 'syntax_error_trigger' is found, but can not be loaded. "
                + "Please check if the file './triggers/syntax_error_trigger.js' is correct.",
      );
    });
  });

  it('Should return error if trigger not initialized', () => {
    const reader = new ComponentReader();
    let filename;
    let error;

    try {
      filename = reader.findTriggerOrAction('some-missing-component');
    } catch (err) {
      error = err;
    }

    waitsFor(() => filename || error, 10000);

    runs(() => {
      expect(error.message).toEqual('Component.json was not loaded');
    });
  });
});
