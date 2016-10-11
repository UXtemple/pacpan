import browserify from 'browserify'
import chalk from 'chalk'
import exorcist from 'exorcist'
import fs from 'fs'
import mkdirp from 'mkdirp'
import rollupify from 'rollupify'
import uglifyJs from 'uglify-js'

export default function bundle(opts) {
  const domain = chalk.dim(`[${opts.domain}]`)

  console.log(domain, `PacPan is getting your Panels app "${opts.expose}" ready to go :)`)
  console.time('pacpan-bundle')

  const b = browserify({
    debug: true,
    entries: [opts.entry]
  })

  // entry point of our app, panels needs this to require it
  b.require(opts.entry, {expose: opts.expose})

  // expose the app dependencies
  b.require(opts.requires)

  // rollupify the bundle
  b.transform(rollupify, {config: opts.rollupConfig})

  // declare our build's externals
  opts.externals.forEach(dep => b.external(dep))

  // make sure the bundle directory exists
  mkdirp.sync(opts.bundle)

  // determine the bundle's full path
  const out = `${opts.expose.replace(/[@\/]/g, '')}-${opts.version}`

  const outJs = `${out}.js`
  const outJsMap = `${outJs}.map`

  const outJsMin = `${out}.min.js`
  const outJsMinMap = `${outJsMin}.map`

  function minify() {
    const minified = uglifyJs.minify(`${opts.bundle}/${outJs}`, {
      compress: {
        screw_ie8: true
      },
      inSourceMap: `${opts.bundle}/${outJsMap}`,
      mangle: {
        screw_ie8: true
      },
      outSourceMap: outJsMinMap
    })

    // write the minified code
    const codeStream = fs.createWriteStream(`${opts.bundle}/${outJsMin}`, 'utf8')
    codeStream.write(minified.code, () => codeStream.end())

    // write the minified map code
    const mapStream = fs.createWriteStream(`${opts.bundle}/${outJsMinMap}`, 'utf8')
    mapStream.write(minified.map, () => mapStream.end())
  }

  function buildIndexHtml() {
    const out = fs.createWriteStream(`${opts.bundle}/index.html`, 'utf8')

    const html = fs.readFileSync(`${__dirname}/playground.html`).toString()
      .replace(
        '<script src=/panels.js></script>\n',
        `<script src=/${outJsMin}></script>\n<script src=https://cdn.uxtemple.com/panels.js></script>\n`
      )

    out.write(html, () => out.end())
  }

  function buildPanelsJson() {
    const out = fs.createWriteStream(`${opts.bundle}/panels.json`, 'utf8')

    const json = fs.readFileSync(`${__dirname}/panels.json`).toString().replace('app.js', outJsMin)

    out.write(json)
    out.end()
  }

  b.bundle()
    .pipe(exorcist(`${opts.bundle}/${outJsMap}`, outJsMap))
    .pipe(fs.createWriteStream(`${opts.bundle}/${outJs}`), 'utf8')
    .on('finish', () => {
      // minify()
      // buildIndexHtml()
      // buildPanelsJson()

      console.timeEnd('pacpan-bundle')
      console.log(domain, `PacPan just finished. Your bundle is at ${opts.bundle}:`)
      console.log(fs.readdirSync(opts.bundle).join(', '))
    })
}
