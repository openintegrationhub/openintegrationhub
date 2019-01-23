const fs = require('fs');
const data = fs.readFileSync(`${__dirname}/../gitchanges.txt`).toString('utf8');
const readjson = fs.readdirSync(`${__dirname}/../services`);
const result = [];
let buildnumber = 'dev';

readjson.forEach((service) => {

    const directMatch = data.match(new RegExp(`services/${service}/`, 'i'));
    const matcher = (directMatch && directMatch.length > 0);
    if (matcher) {

        console.log(service);
        const temp = JSON.parse(fs.readFileSync(`${__dirname}/../services/${service}/package.json`));
        if (process.env.TRAVIS_BUILD_NUMBER) buildnumber = process.env.TRAVIS_BUILD_NUMBER
        if (process.env.CIRCLE_BUILD_NUM) buildnumber = process.env.CIRCLE_BUILD_NUM
        result.push({
            name: service,
            version: `${temp.version}_${buildnumber}`
        });
    }
});
fs.writeFileSync(`${__dirname}/toBuild.json`, JSON.stringify(result));
