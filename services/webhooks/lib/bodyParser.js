'use strict';
const bodyParser = require('body-parser');
const xmlparser = require('express-xml-bodyparser');
const multiplart = require('./attachments').middleware;
const bodyToAttachment = require('./attachments').bodyToAttachment;

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


module.exports = (app, { limit } = {}) => {
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

    app.use(multiplart({
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
