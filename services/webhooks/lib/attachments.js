'use strict';
const { URL } = require('url');
const multiparty = require('multiparty');
const onFinished = require('on-finished');
const qs = require('qs');
const typeis = require('type-is');
const rp = require('request-promise');
const fs = require('fs');
const request = require('request');
const os = require('os');
const path = require('path');
const mime = require('mime-types');

const init = require('./init');

async function processAttachment(descriptor, log) {
    const [size, contentType] = [descriptor.size, descriptor.headers['content-type']];
    const logger = log.child(descriptor);
    const config = init.getConfig();
    const stewardURI = config.get('STEWARD_URI');
    logger.info('Processing uploaded file');
    const result = {
        'content-type': contentType,
        'size': size
    };

    const stewardHostnameInPlatformCluster = (new URL(stewardURI)).hostname;
    logger.trace('Getting a new storage URL for attachment');
    const storage = await rp.post(`${stewardURI}/files`, {
        json: true
    });
    result.url = storage.get_url;
    return new Promise(function uploadAttachment(resolve, reject) {
        /**
         * A little bit magic:
         * Problem we have 2 clusters: 1) with customer tasks 2) with platform
         * In this clusters steward service is accessible by different domain names
         * So in platform cluter (where webhooks services is run) we need to use domain
         * from process.env.STEWARD_URI
         * But customer tasks should access steward by URI, in way as steward returns by itself
         * @see webhooks-74
         */
        const putUrl = new URL(storage.put_url);
        putUrl.hostname = stewardHostnameInPlatformCluster;
        const putUrlInPlatformCluster = putUrl.toString();

        logger.trace('Uploading attachments to uri=%s', putUrlInPlatformCluster);
        fs.createReadStream(descriptor.path).pipe(request.put({
            'uri': putUrlInPlatformCluster,
            'content-type': contentType,
            'content-length': size
        })).on('end', () => {
            resolve(result);
        }).on('error', (err) => {
            reject(err);
        });
    });
}

/**
 * Please use this function as usual middleware
 *
 * @type {module.exports}
 */
function middleware(options) {
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
 * This function will do the clean-up, it shouldn't throw any exceptions
 *
 * @param req
 */
function cleanup(req, logger) {
    try {
        if (req.files) {
            logger.debug(req.files, 'Cleaning-up the attachments');
            for (const fieldName in req.files) {
                const file = req.files[fieldName];
                try {
                    fs.unlinkSync(file.path);
                } catch (err) {
                    logger.error('Error during cleanup', err);
                }
            }
        }
    } catch (err) {
        logger.error('Error during cleanup', err);
    }
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
function bodyToAttachment(req,res,buf) {
    // Store rawBody for HMAC calculation
    Object.assign(req, {
        rawBody: buf
    });
    const ct = req.headers['content-type'] || 'application/octet-stream';
    const ext = mime.extension(ct);
    const fpath = path.join(os.tmpdir(), Math.random().toString(35).substr(2, 30) + '.' + ext);
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

exports = module.exports = {
    middleware: middleware,
    processAttachment: processAttachment,
    cleanup: cleanup,
    bodyToAttachment: bodyToAttachment
};
