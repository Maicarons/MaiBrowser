const fs = require('node:fs')
const path = require('node:path')

// Lynxtron-builder writes the packaged app to <appOutDir>/app, but Electron
// only auto-loads <appOutDir>/resources/app when the executable is started
// without an explicit app path. Move the real payload there and leave a tiny
// stub behind for electron-builder's package sanity check.
module.exports = async function afterPack(context) {
  const appDir = path.join(context.appOutDir, 'app')
  const resourceAppDir = path.join(context.appOutDir, 'resources', 'app')
  if (!fs.existsSync(appDir)) return

  fs.rmSync(resourceAppDir, { recursive: true, force: true })
  fs.mkdirSync(path.dirname(resourceAppDir), { recursive: true })
  fs.renameSync(appDir, resourceAppDir)

  fs.mkdirSync(appDir, { recursive: true })
  fs.writeFileSync(
    path.join(appDir, 'main.js'),
    "throw new Error('MaiBrowser is loaded from resources/app')\n",
  )
  fs.writeFileSync(
    path.join(appDir, 'package.json'),
    JSON.stringify({
      name: 'maibrowser-packaging-stub',
      version: '0.1.2',
      main: 'main.js',
    }),
  )
}
