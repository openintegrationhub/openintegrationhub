import DataHubApp from '.';

(async () => {
    const app = new DataHubApp();
    await app.start();
})().catch(err => {
    console.error(err);
    process.exit(1);
});



