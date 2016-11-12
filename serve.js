import { createSecureContext } from 'tls'
import chalk from 'chalk'
import createHandler from './serve-handler'
import fs from 'fs'
import http from 'http'
import https from 'https'

const HOST = '0.0.0.0'

export default function serve(apps) {
  const appsByRoot = {}
  const roots = apps.map(app => {
    const root = `${app.domain}${app.root}`
    appsByRoot[root] = app
    if (app.secure) {
      app.secureContext = createSecureContext({
        cert: fs.readFileSync(app.secure.cert),
        key: fs.readFileSync(app.secure.key)
      })
    }
    return root
  })

  const findApp = req => {
    const fullUrl = `${req.headers.host}${req.url}`
    const root = roots.filter(r => fullUrl.indexOf(r.replace(/\/$/, '')) === 0).sort()[0]
    return appsByRoot[root] || apps[0]
  }

  let warnedAboutSecure = false

  const SNICallback = (domain, cb) => {
    try {
      // any app on that domain will do as they should all have the same key/cert
      const app = apps.find(a => a.domain === domain)

      if (!app.secure && !warnedAboutSecure) {
        warnedAboutSecure = true
        setTimeout(() => warnedAboutSecure = false, 100)

        console.log(chalk.red(`You tried to access ${domain} through https but we don't have its certificate and key.`),
`Does the app's panels.config.js include a secure key like?:

  secure: {
    cert: '/path/to/file.cert',
    key: '/path/to/file.key'
  }

If you don't care about https, you can always access http://${domain}`)
      }

      cb(null, app.secureContext)
    } catch(err) {
      console.log(chalk.red(domain), err)
    }
  }

  const handler = (req, res) => {
    const app = findApp(req)
    app.handler(req, res, () => createHandler(app)(req, res))
  }

  const s = https.createServer({ SNICallback }, handler)
  s.on('error', console.error.bind(console))
  s.on('listening', () => {
    const list = apps.filter(a => a.secure)
    if (list.length) {
      console.log(list.map(app => `  https://${app.domain}${app.root}`).join('\n'))
    }
  })
  s.listen(443, HOST)

  const s2 = http.createServer(handler)
  s2.on('error', console.error.bind(console))
  s2.on('listening', () => {
    console.log(apps.map(app => `  http://${app.domain}${app.root}`).join('\n'))
  })
  s2.listen(80, HOST)
}
