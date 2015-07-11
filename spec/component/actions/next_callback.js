exports.process = processAction;

function processAction(msg, cfg, next, snapshot){
    if (msg.error) {
        return next(new Error('tmp error'));
    }
    return next(null, {some: 'data'}, snapshot);
}