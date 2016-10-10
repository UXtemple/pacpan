module.exports = function secure(app) {
  if (secured[app.domain]) return secured[app.domain]

  try {
    child_process.execSync(`security delete-certificate -c ${app.domain}`, { silent: true })
  } catch (err) {
  }

  const s = createCSR({ commonName: app.domain })
    .then(sig =>
      createCertificate({
        clientKey: sig.clientKey,
        csr: sig.csr,
        days: 30,
        selfSigned: true
      })
    ).then(keys => {
      const tmp = `${process.cwd()}/.${app.domain}.crt.tmp`
      fs.writeFileSync(tmp, keys.certificate)
      child_process.execSync(`security add-trusted-cert -d -r trustRoot -k "/Library/Keychains/System.keychain" ${tmp}`)
      fs.unlinkSync(tmp)

      APPS[app.domain] = {
        app,
        ctx: tls.createSecureContext({
          cert: keys.certificate,
          key: keys.serviceKey
        })
      }
    })

  secured[app.domain] = s
  return s
}
