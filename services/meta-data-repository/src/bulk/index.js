const path = require('path');
const fs = require('fs-extra');
const readdirp = require('readdirp');
const { unpack, getFileType } = require('../packing');
const { validateSchema, transformSchema } = require('../transform');

module.exports = {
    processArchive(archivePath) {
        return new Promise(async (resolve, reject) => {
            try {
                const fileType = getFileType(archivePath);
                const root = path.dirname(archivePath);
                if (fileType) {
                    const transformedSchemas = [];
                    // unpack in place
                    await unpack(fileType, archivePath, root);

                    readdirp({ root, fileFilter: '*.json' }, async (err, res) => {
                        for (const file of res.files) {
                            const schema = await fs.readFile(file.fullPath, 'utf-8');

                            validateSchema({
                                schema,
                            });

                            transformedSchemas.push(await transformSchema({
                                // domain: req.params.id,
                                schema,
                                jsonRefsOptions: {
                                    location: file.fullPath,
                                    root,
                                },
                            }));
                        }

                        resolve(transformedSchemas);
                    });
                }
            } catch (err) {
                return reject(err);
            }
        });
    },
};
