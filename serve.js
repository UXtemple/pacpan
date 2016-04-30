'use strict';

const http = require('http');
const fs = require('fs');
const send = require('send');

const panelsVersion = require('panels/package.json').version;
const panelsFile = require.resolve(`panels/bundle/panels-${panelsVersion}.js`);
const panelsJsonFile = `${__dirname}/panels.json`;
const playgroundFile = `${__dirname}/playground.html`;

module.exports = function serve(opts) {
  const s = http.createServer((req, res) => {
    try {
      const assetFile = `${opts.assets}${req.url}`;
      let file;

      if (req.url === '/panels.js') {
        // serve the panels runtime
        file = panelsFile;

      } else if (req.url === `/panels-${panelsVersion}.js.map`) {
        // serve the panels runtime source map
        file = `${panelsFile}.map`;

      } else if (req.url === '/app.js') {
        // serve panels packaged app.js'
        file = opts.tmp;

      } else if (fs.existsSync(assetFile)) {
        // serve any files that may exist in assets
        file = assetFile;

      } else if (req.url === '/panels.json') {
        // serve panels.json if it wasn't served from assets
        file = panelsJsonFile;

      } else {
        // catch all for index
        const customIndexFile = `${opts.assets}/index.html`;

        file = fs.existsSync(customIndexFile) ? customIndexFile : playgroundFile;
      }

      send(req, file).pipe(res);
    } catch(err) {
      console.error('err', err)
    }
  });

  s.listen(opts.port, opts.host);

  s.on('error', error => {
    if (error && error.code === 'EACCES') {
      console.error(`Can't use port ${opts.port} to run your app. Try running "sudo pacpan" instead`);
      process.exit();
    }
  });

  s.on('listening', () => {
    console.log(`pacpan is running at http://${opts.expose}`);
  });
}
