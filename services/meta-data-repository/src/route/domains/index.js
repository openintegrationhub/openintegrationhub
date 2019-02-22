const express = require('express');

const router = express.Router();

// GET
// /domains
// Retrieve the available domains for the authenticated user
// POST
// /domains
// Create a new Domain.
// GET
// /domains/{domainId}
// Retrieve a domain with given ID.
// PUT
// /domains/{domainId}
// Update a domain by ID.
// POST
// /domains/{domainId}/import
// Import models.
// GET
// /domains/{domainId}/schemas
// Retrieve the available models for the authenticated user.
// GET
// /domains/{domainId}/schemas/{uri}
// Retrieve a schema by URI.
// PUT
// /domains/{domainId}/schemas/{uri}
// Update a schema with given URI.
// DELETE
// /domains/{domainId}/schemas/{uri}
// Delete a schema by uri

router.get('/', async (req, res) => {
    res.sendStatus(200);
});

module.exports = router;
