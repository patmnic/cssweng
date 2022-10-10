import { app, nativeTheme, BrowserWindow, ipcMain } from 'electron'
import { EFFECT, PARAMS, MicaBrowserWindow } from 'mica-electron';
import path from 'path'
import { readFile } from 'fs/promises'
import ExcelJS from 'exceljs'
import os from 'os'
import { event } from 'quasar';
import { default as summarizeData }from './handlers/summarizeData.js'
import { loadXlsx } from './handlers/loadXlsx.js'

// needed in case process is undefined under Linux
const platform = process.platform || os.platform()

try {
  if (platform === 'win32' && nativeTheme.shouldUseDarkColors === true) {
    require('fs').unlinkSync(path.join(app.getPath('userData'), 'DevTools Extensions'))
  }
} catch (_) { }

let mainWindow

if(os.release().split('.')[2] >= 22000) {
  app.commandLine.appendSwitch("enable-transparent-visuals");
}

function createWindow() {
  /**
   * Initial window options
   */
  if(os.release().split('.')[2] >= 22000) {
  mainWindow = new MicaBrowserWindow({
      icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
      width: 1000,
      height: 600,
      useContentSize: true,
      effect: EFFECT.BACKGROUND.MICA,
      theme: PARAMS.THEME.AUTO,
      autoHideMenuBar: true,
      show: false,
      webPreferences: {
        contextIsolation: true,
        // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
        preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
      }
    })
    mainWindow.setMenuBarVisibility(false)
    mainWindow.webContents.once('dom-ready', () => {
      mainWindow.show();
    });
  }
  else {
    mainWindow = new BrowserWindow({
      icon: path.resolve(__dirname, 'icons/icon.png'), // tray icon
      width: 1000,
      height: 600,
      useContentSize: true,
      autoHideMenuBar: true,
      webPreferences: {
        contextIsolation: true,
        // More info: https://v2.quasar.dev/quasar-cli-vite/developing-electron-apps/electron-preload-script
        preload: path.resolve(__dirname, process.env.QUASAR_ELECTRON_PRELOAD)
      }
    })
  }
  mainWindow.loadURL(process.env.APP_URL)

  if (process.env.DEBUGGING) {
    // if on DEV or Production with debug enabled
    mainWindow.webContents.openDevTools()
  } else {
    // we're on production; no access to devtools pls
    mainWindow.webContents.on('devtools-opened', () => {
      mainWindow.webContents.closeDevTools()
    })
  }

  mainWindow.on('closed', () => {
    mainWindow = null
  })

  nativeTheme.on("updated", () => {
    mainWindow.webContents.send('theme-changed', nativeTheme.shouldUseDarkColors)
  })

  

}

app.whenReady().then(createWindow)

app.on('window-all-closed', () => {
  if (platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow()
  }
})

ipcMain.handle('getThemeMode', async (event, arg) => {
  return nativeTheme.shouldUseDarkColors;
})
ipcMain.handle('isMica', async (event, arg) => {
  return os.release().split('.')[2] >= 22000;
})
summarizeData(); // basically just call the funtion/s

loadXlsx(); //

/*
ipcMain.handle('loadXlsx', async (event, path) => {
  let excelFile = await readFile(path).catch(err => console.log(err))
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(excelFile);

  let players = [];
  // Initialize Players
  let playWorksheet = workbook.getWorksheet("Jojo Bettors")
  if(!playWorksheet) { return { error: "Missing Jojo Bettors Worksheet", errorType: "error"} }
  playWorksheet.eachRow(row => {
    if (row._cells[0].value === null) return
    players.push({
      name: row._cells[0].value,
      tong: row._cells[1].value,
      comm: row._cells[2].value,
      bets: []
    })
  })

  let dayWorksheets = [];
  let daysRegex = /\b((mon|tue|wed(nes)?|thu(rs)?|fri|sat(ur)?|sun)(day)?)\b/gi
  workbook.eachSheet((sheet, id) => {
    if (sheet.name.match(daysRegex)) dayWorksheets.push(workbook.getWorksheet(id))
  })

  dayWorksheets.forEach(sheet => {
    let playerRow = sheet.getRow(1).values;
    playerRow = playerRow.filter((value, index) => {
      if (value.formula?.includes("Jojo Bettors")) {
        value.index = index
        return value
      }
    })
    playerRow.forEach(p => {
      players.forEach(player => {
        if (p.result === player.name) {
          let column = sheet.getColumn(p.index)
          column.eachCell((cell, rowNum) => {
            if (typeof (cell.value) == "number") {
              let bet = {};
              bet.day = sheet.name
              bet.amount = cell.value;
              // console.log(sheet.getRow(rowNum).getCell(1).value)
              if (sheet.getRow(rowNum).getCell(1).value.match(/under/gi)) {
                bet.team = `${sheet.getRow(rowNum - 2).getCell(1).value} / ${sheet.getRow(rowNum).getCell(1).value.toUpperCase()}`
              }
              else if (sheet.getRow(rowNum).getCell(1).value.match(/over/gi)) {
                bet.team = `${sheet.getRow(rowNum - 3).getCell(1).value} / ${sheet.getRow(rowNum).getCell(1).value.toUpperCase()}`
              }
              else {
                bet.team = sheet.getRow(rowNum).getCell(1).value
              }
              bet.result = sheet.getRow(rowNum).getCell(3).value
              player.bets.push(bet)
            }
          })
        }
      })
    })
  })
  console.log(`Loaded ${players.length} players`)
  return players
})
*/

// ipcMain.handle('summarizeData', async (event, data) => {
//   data.forEach(sheet => {
//     console.log(sheet.name, sheet.rowCount, sheet.columnCount, sheet.state)
//   });
// })

