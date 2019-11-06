import App from '.';

(async () => {
    const app = new App();
    await app.start();
})().catch(err => {
    console.error(err);
    process.exit(1);
});



