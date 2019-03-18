const path = require('path');
const { unpack, getFileType } = require('../packing');

module.exports = {
    async processArchive(archivePath) {
        const fileType = getFileType(archivePath);
        if (fileType) {
            console.log(path.basename(archivePath));
            await unpack(fileType, archivePath, path.basename(archivePath));
        }
    },
};
