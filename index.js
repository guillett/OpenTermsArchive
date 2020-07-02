import CGUs from './src/index.js';

(async () => {
  try {
    const app = new CGUs();
    await app.init();

    await app.updateTerms();
  } catch (e) {
    console.log(e);
  }
})();
