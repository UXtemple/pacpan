const { resolve } = require('path');
const fs = require('fs');

module.exports = function getConfig(raw) {
  const path = resolve(raw);

  const configFile = `${path}/.panels.js`;
  const pkg = require(`${path}/package.json`);
  const rollupConfig = require(`${__dirname}/rollup.config.js`)(path)
  const version = pkg.version || 'dev';

  const defaultOpts = {
    // static assets path to put your images, files, etc.
    assets: `${path}/public`,

    // the path to the bundleda pp
    bundle: `${path}/bundle/${version}`,

    // the app's entry point
    entry: `${path}/${pkg.main}`,

    // dependencies that panels already bundles for us and we can safely declare as externals
    externals: Object.keys(
      require('panels/package.json').dependencies
    ).concat('redux-promise'),

    // the app's name that panels will call it after, generally its the domain where it runs
    expose: pkg.name,

    // the domain to run on, defaults to the package name
    domain: pkg.name,

    // web handler for specific requests in dev mode
    handler: (req, res, next) => next(),

    // host to run the dev server at
    host: '0.0.0.0',

    // expose your own requires for your own use too
    requires: [], // pkg.dependencies ? Object.keys(pkg.dependencies) : [],

    // path to rollup.config.js used to transform the code
    rollupConfig,

    // list of path regexes to serve as regular files and not to try to render them as panels paths
    serveAsIs: [],

    // path to the temporary bundle used when watching
    tmp: `${path}/panels.app.tmp.js`,

    // the version we're working on
    version: version
  };


  return fs.existsSync(configFile) ?
    Object.assign(defaultOpts, require(configFile)) :
    defaultOpts;
}
