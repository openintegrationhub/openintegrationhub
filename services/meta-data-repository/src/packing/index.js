const JSZip = require('jszip');
const readdirp = require('readdirp');
const fs = require('fs-extra');
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
        return new Promise((resolve, reject) => {
            if (type === 'zip') {
                const zip = new JSZip();
                readdirp({ root: src /** __dirname, '../../../test/data/valid') */, fileFilter: '*.json' }, async (err, res) => {
                    for (const file of res.files) {
                        zip.file(file.path, fs.readFileSync(file.fullPath));
                    }

                    zip
                        .generateNodeStream({ streamFiles: true })
                        .pipe(fs.createWriteStream(dest))
                        .on('finish', async () => {
                            resolve();
                        });
                });
            } else if (type === 'tgz') {
                tar.c(
                    {
                        gzip: true,
                        file: dest,
                        C: src,
                    },
                    [...fs.readdirSync(src)],
                ).then(resolve);
            } else {
                reject(new Error('Invalid Archive Type. Use tgz or zip'));
            }
        });
    },
    unpack(type, src, dest) {
        return new Promise(async (resolve, reject) => {
            if (type === 'zip') {
                fs.readFile(src, async (err, data) => {
                    if (!err) {
                        const promises = [];
                        const contents = await JSZip.loadAsync(data);
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
                await fs.ensureDir(dest);
                tar.x( // or tar.extract(
                    {
                        file: src,
                        C: dest, // alias for cwd:'some-dir', also ok
                    },
                ).then(resolve);
            } else {
                reject(new Error('Invalid Archive Type. Use tgz or zip'));
            }
        });
    },
};
