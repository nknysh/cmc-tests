import fs from 'node:fs'
import path from 'node:path'

const WINDOW_FILE = path.join(__dirname, 'btc-price-window.json')

export interface BtcPriceWindow {
  min: number
  max: number
}

export function readBtcPriceWindow(): BtcPriceWindow {
  return JSON.parse(fs.readFileSync(WINDOW_FILE, 'utf-8'))
}

export function writeBtcPriceWindow(window: BtcPriceWindow): void {
  fs.writeFileSync(WINDOW_FILE, JSON.stringify(window, null, 2) + '\n')
}
