const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const multiparty = require('multiparty');
const onFinished = require('on-finished');
const qs = require('qs');
const fs = require('fs');
const typeis = require('type-is');
const os = require('os');
const path = require('path');
const mime = require('mime-types');

const TEXT_MIME_TYPES = [
    'text/csv',
    'text/yaml',
    'text/html',
    'text/javascript'
];

const RAW_MIME_TYPES = [
    'application/pdf',
    'application/zip',
    'application/excel',
    'application/x-excel',
    'image/png',
    'image/jpeg',
    'image/gif',
    'image/bmp'
];

function setRawBody(req, res, buf) {
    Object.assign(req, {
        rawBody: buf
    });
}

/**
 * Please use this function as usual middleware
 *
 * @type {module.exports}
 */
function multipart(options) {
    options = options || {};

    return function multipart(req, res, next) {
        if (req._body) {return next();}
        req.body = req.body || {};
        req.files = req.files || {};

        // ignore GET
        if (req.method === 'GET' || req.method === 'HEAD') {return next();}

        // check Content-Type
        if (!typeis(req, 'multipart/form-data')) {return next();}

        // flag as parsed
        req._body = true;

        // parse
        const form = new multiparty.Form(options);
        const data = {};
        const files = {};
        let done = false;

        form.on('field', (name, val) => {
            if (Array.isArray(data[name])) {
                data[name].push(val);
            } else if (data[name]) {
                data[name] = [data[name], val];
            } else {
                data[name] = val;
            }
        });

        // Here we explicitly enable buffering of the files with maxFilesSize is set
        // on the disk - reason for that
        // we can't decide what to do with the files
        // until we HMAC verification or any other type of
        // authentication is done on the request
        // we have to be very sure that files we receive are OK and needed
        form.on('file', (fieldName, file) => {
            files[fieldName] = file;
        });

        form.on('error', (err) => {
            if (done) {return;}

            done = true;
            err.status = 400;

            if (!req.readable) {return next(err);}

            req.resume();
            onFinished(req, () => {
                next(err);
            });
        });

        form.on('close', () => {
            if (done) {return;}

            done = true;

            try {
                // We will also handle usual form values
                // as values in the GET query
                req.body = qs.parse(data);
                req.files = qs.parse(files);
                next();
            } catch (err) {
                err.status = 400;
                next(err);
            }
        });

        form.parse(req);
    };
}

/**
 * This function will write the buffer to a file
 * and emulate the multiparty behavior
 *
 * @param req
 * @param res
 * @param buf
 * @param encoding
 */
function bodyToAttachment(req, res, buf) {
    // Store rawBody for HMAC calculation
    Object.assign(req, {
        rawBody: buf
    });
    const ct = req.headers['content-type'] || 'application/octet-stream';
    const ext = mime.extension(ct);
    const fpath = path.join(os.tmpdir(), Math.random().toString(35).substr(2, 30) + '.' + ext);

    //@todo: cleanup tmp files
    fs.writeFileSync(fpath, buf);

    req.files = {
        payload: {
            originalFilename: `payload.${ext}`,
            path: fpath,
            headers: req.headers,
            size: buf.length
        }
    };
}

/**
 * Sets required middlewares for processing an incoming request's body.
 * @param {app} app - express application instance
 * @param {Object} options
 * @param {(string|number)} limit - Controls the maximum request body size. If this is a number, then the value specifies the number of bytes; if it is a string, the value is passed to the {@link https://www.npmjs.com/package/bytes|bytes} library for parsing.
 * @returns {app} - express application instance
 */
module.exports = (app, { limit = '10mb' } = {}) => {
    const verify = setRawBody;

    app.use(bodyParser.json({
        limit,
        verify
    }));

    app.use(bodyParser.json({
        type: 'text/plain',
        limit,
        verify
    }));

    app.use(bodyParser.urlencoded({
        extended: true,
        limit,
        verify
    }));

    // This guy will handle all -xml content types
    app.use(xmlparser({
        trim: false,
        normalize: false,
        explicitArray: false,
        normalizeTags: false,
        attrkey: '_attr',
        tagNameProcessors: [
            (name) => name.replace(':', '-')
        ]
    }));

    app.use(multipart({
        maxFieldsSize: limit,
        maxFilesSize: limit
    }));

    // Parsing of the text-based payloads
    app.use(bodyParser.text({
        type: TEXT_MIME_TYPES,
        limit,
        verify: bodyToAttachment
    }));

    // Parsing of binary mime-types
    app.use(bodyParser.raw({
        type: RAW_MIME_TYPES,
        limit,
        verify: bodyToAttachment
    }));

    return app;
};
