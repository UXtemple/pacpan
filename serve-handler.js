import { parse } from 'url'
import fs from 'fs'
import send from 'send'

const panelsVersion = require('panels/package.json').version
const panelsJs = require.resolve(`panels/bundle/panels-${panelsVersion}.js`)
const panelsJsonFile = `${__dirname}/panels.json`
const playgroundFile = `${__dirname}/playground.html`

const FILES = {
  // serve the panels runtime
  'panels.js': panelsJs,
  // serve panels.json if it wasn't served from assets
  'panels.json': panelsJsonFile,
  // serve the panels runtime source map
  [`panels-${panelsVersion}.js.map`]: `${panelsJs}.map`
}

function isFile(file) {
  try {
    const stat = fs.statSync(file)
    return stat.isFile()
  } catch(err) {
    return false
  }
}

export default app => (req, res) => {
  try {
    const pathname = parse(req.url).pathname.replace(app.root, '')
    const assetFile = `${app.assets}${pathname}`
    let file

    if (pathname === 'app.js') {
      // serve panels packaged app.js'
      file = app.tmp
    } else if (isFile(assetFile)) {
      // serve static assets
      file = assetFile
    } else if (FILES[pathname]) {
      file = FILES[pathname]
    } else if (app.serveAsIs.find(regex => regex.test(pathname))) {
      // serve files that the user defined they want them like that
      if (isFile(assetFile)) {
        file = assetFile
      }
    } else {
      // catch all for index
      const customIndexFile = `${app.assets}/index.html`

      file = fs.existsSync(customIndexFile) ? customIndexFile : playgroundFile
    }

    res.setHeader('Access-Control-Allow-Origin', '*')
    res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept')
    send(req, file).pipe(res)
  } catch(err) {
    res.writeHead(404)
    res.end()
  }
}
