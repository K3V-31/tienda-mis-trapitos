import { app, BrowserWindow } from 'electron'
import { join } from 'path'
import { getDatabasePath } from './db/client'
import { migrateDatabase } from './db/migrate'
import { seedDatabase } from './db/seed'
import { registerIpcHandlers } from './ipc'

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 1024,
    minHeight: 720,
    title: 'Mis Trapitos POS',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  })

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL)
  } else {
    win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

async function bootstrapApp() {
  migrateDatabase()
  await seedDatabase()
  registerIpcHandlers()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

app.whenReady().then(() => {
  void bootstrapApp()
    .then(() => {
      console.info(`Database ready at ${getDatabasePath()}`)
    })
    .catch((error) => {
      console.error('Failed to bootstrap app', error)
      app.quit()
    })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
