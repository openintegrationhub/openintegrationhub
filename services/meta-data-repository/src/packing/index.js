const JSZip = require('jszip');
const readdirp = require('readdirp');
const fs = require('fs-extra');
const path = require('path');
const tar = require('tar');

module.exports = {
    getFileType(archivePath) {
        if (archivePath.match(/^.*\.zip$/)) {
            return 'zip';
        }

        if (archivePath.match(/^.*\.(tar\.gz|tgz)$/)) {
            return 'tgz';
        }
        return null;
    },
    pack(type, src, dest) {
        return new Promise(async (resolve, reject) => {
            if (type === 'zip') {
                const zip = new JSZip();
                await fs.ensureDir(path.dirname(dest));
                const files = await readdirp.promise(src, { fileFilter: '*.json' });

                for (const file of files) {
                    zip.file(file.path, fs.readFileSync(file.fullPath));
                }

                zip
                    .generateNodeStream({ streamFiles: true })
                    .pipe(fs.createWriteStream(dest))
                    .on('finish', () => {
                        resolve();
                    });
            } else if (type === 'tgz') {
                await fs.ensureDir(path.dirname(dest));
                await tar.c({
                    gzip: true,
                    file: dest,
                    C: src,
                },
                [...fs.readdirSync(src)]);
                resolve();
            } else {
                reject(new Error('Invalid archive Type. Use tgz or zip'));
            }
        });
    },
    unpack(type, src, dest) {
        return new Promise(async (resolve, reject) => {
            if (type === 'zip') {
                fs.readFile(src, async (err, data) => {
                    if (!err) {
                        const promises = [];
                        let contents = {};
                        try {
                            contents = await JSZip.loadAsync(data);
                        } catch (err) {
                            return reject(err);
                        }

                        Object.keys(contents.files).forEach((fileName) => {
                            if (!contents.files[fileName].dir) {
                                promises.push(new Promise(async (resolve) => {
                                    const content = await (contents.file(fileName)).async('nodebuffer');
                                    await fs.outputFile(`${dest}/${fileName}`, content);
                                    resolve();
                                }));
                            }
                        });
                        await Promise.all(promises);
                        resolve();
                    } else {
                        reject(err);
                    }
                });
            } else if (type === 'tgz') {
                try {
                    await fs.ensureDir(dest);
                    await tar.x({
                        file: src,
                        C: dest,
                        strict: true,
                    });
                    resolve();
                } catch (err) {
                    reject(err);
                }
            } else {
                reject(new Error('Invalid archive Type. Use tgz or zip'));
            }
        });
    },
};
