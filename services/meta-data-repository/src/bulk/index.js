const path = require('path');
const fs = require('fs-extra');
const readdirp = require('readdirp');
const { unpack, getFileType } = require('../packing');
const { validateSchema, transformSchema } = require('../transform');

module.exports = {
    async processArchive(archivePath, domainId) {
        const fileType = getFileType(archivePath);
        const root = path.dirname(archivePath);
        if (fileType) {
            const transformedSchemas = [];
            // unpack in place
            await unpack(fileType, archivePath, root);

            const files = await readdirp.promise(root, { fileFilter: '*.json' });
            for (const file of files) {
                const schema = await fs.readFile(file.fullPath, 'utf-8');

                validateSchema({
                    schema,
                });

                transformedSchemas.push(await transformSchema({
                    domain: domainId,
                    schema,
                    jsonRefsOptions: {
                        location: file.fullPath,
                        root,
                    },
                }));
            }

            return transformedSchemas;
        }
    },
};
