const express = require('express');
const bodyParser = require('body-parser');

/* eslint no-underscore-dangle: "off" */
/* eslint consistent-return: "off" */
/* eslint prefer-destructuring: "off" */

const { can } = require('@openintegrationhub/iam-utils');
const config = require('../../config/index');

const storage = require(`../utils/${config.storage}`); // eslint-disable-line

const jsonParser = bodyParser.json();
// const urlParser = bodyParser.urlencoded({ extended: false });
const router = express.Router();

const log = require('../../config/logger'); // eslint-disable-line

// Gets all logs
router.get('/', jsonParser, can(config.logReadPermission), async (req, res) => {
    let pageSize = 10;
    let pageNumber = 1;
    let filters = {};

    if (req.query.filter) filters = Object.assign(req.query.filter);

    // const sortableFields = { timeStamp: 1, service: 1 };
    const sortField = 'createdAt';
    const sortOrder = '-1';

    // page[size]
    if (req.query.page && (req.query.page.size !== undefined && pageSize > 1)) {
        pageSize = parseInt(req.query.page.size, 10);
    }
    // page[number]
    if (req.query.page && (req.query.page.number !== undefined && pageNumber > 0)) {
        pageNumber = parseInt(req.query.page.number, 10);
    }

    const response = await storage.getLogs(req.user,
        pageSize,
        pageNumber,
        filters,
        sortField,
        sortOrder);

    if (!res.headersSent) {
        response.meta.page = pageNumber;
        response.meta.perPage = pageSize;
        response.meta.totalPages = Math.ceil(response.meta.total / pageSize);
        res.json(response);
    }
});

module.exports = router;
