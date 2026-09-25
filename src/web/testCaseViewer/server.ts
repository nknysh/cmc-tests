import { createServer } from 'node:http'
import type { IncomingMessage, ServerResponse } from 'node:http'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { TestCaseStore } from '../../db/testCases'

const HOST = '127.0.0.1'
const DEFAULT_PORT = 4000

const store = new TestCaseStore({ dbPath: process.env.TEST_CASES_DB })
const indexHtml = readFileSync(join(__dirname, 'index.html'), 'utf8')

function send(res: ServerResponse, status: number, contentType: string, body: string): void {
  res.writeHead(status, { 'Content-Type': contentType, 'X-Content-Type-Options': 'nosniff' })
  res.end(body)
}

function sendJson<T>(res: ServerResponse, status: number, body: T): void {
  send(res, status, 'application/json; charset=utf-8', JSON.stringify(body))
}

function route(req: IncomingMessage, res: ServerResponse): void {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return sendJson(res, 405, { error: 'Method not allowed' })
  }

  const { pathname } = new URL(req.url ?? '/', `http://${HOST}`)

  if (pathname === '/') return send(res, 200, 'text/html; charset=utf-8', indexHtml)
  if (pathname === '/api/suites') return sendJson(res, 200, store.getSuiteTree())
  if (pathname === '/api/test-cases/unsorted') return sendJson(res, 200, store.listUnassignedTestCases())

  const suiteCases = /^\/api\/suites\/(\d+)\/test-cases$/.exec(pathname)
  if (suiteCases) return sendJson(res, 200, store.listTestCasesBySuite(Number(suiteCases[1])))

  const testCase = /^\/api\/test-cases\/(\d+)$/.exec(pathname)
  if (testCase) {
    const found = store.getTestCase(Number(testCase[1]))
    return found ? sendJson(res, 200, found) : sendJson(res, 404, { error: 'Test case not found' })
  }

  sendJson(res, 404, { error: 'Not found' })
}

const server = createServer((req, res) => {
  try {
    route(req, res)
  } catch (error) {
    console.error('[TestCaseViewer]', error)
    sendJson(res, 500, { error: 'Internal server error' })
  }
})

const port = Number(process.env.PORT ?? DEFAULT_PORT)
server.listen(port, HOST, () => {
  console.log(`[TestCaseViewer] http://${HOST}:${port}`)
})

process.on('SIGINT', () => {
  server.close()
  store.close()
  process.exit(0)
})
