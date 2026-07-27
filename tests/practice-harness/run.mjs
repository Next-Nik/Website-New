// tests/practice-harness/run.mjs
//
// Drives the built harness with real Playwright clicks against the
// STANDALONE Practice page (src/pages/Practice.jsx) — no more tab
// navigation, since this is now its own tool with its own front door rather
// than a tab inside Care Protocol:
//   1. Page loads → all panels render directly (no tab click needed).
//   2. State check-in → button confirms, truth line renders, counter-line
//      editor works and renders in italic.
//   3. Urge log → chips select, entry logs, the AI reflection renders under
//      the button, and the request body carried the practice payload with
//      the real trigger text.
//   4. Loop preset → confirms and appears in today's list.
//   5. Receipts, the day (anchor + return), the breath, bookends,
//      co-regulation, the tape + scene last, the receiving window.
//   6. History shows the day. No streak language anywhere.
//
// Run:  node tests/practice-harness/run.mjs   (after building the harness)

import { chromium } from 'playwright'
import { createServer } from 'http'
import { readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'

const here = path.dirname(fileURLToPath(import.meta.url))
const dist = path.join(here, 'dist')

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' }
const server = createServer(async (req, res) => {
  const url = req.url.split('?')[0]
  const file = path.join(dist, url === '/' ? 'index.html' : url)
  try {
    const body = await readFile(file)
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' })
    res.end(body)
  } catch {
    res.writeHead(404); res.end('nope')
  }
})
await new Promise((r) => server.listen(4174, r))

const results = []
const check = (name, cond) => {
  results.push([name, Boolean(cond)])
  console.log(`  ${cond ? '✓' : '✗'} ${name}`)
}

const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH || undefined })
const page = await browser.newPage({ viewport: { width: 390, height: 844 } })
const errors = []
page.on('pageerror', (e) => errors.push(String(e)))

await page.goto('http://localhost:4174/')
await page.waitForSelector('text=THE PRACTICE', { timeout: 15000 })

/* 1 · the page itself is the tool — every panel present with no navigation */
for (const eyebrow of ['STATE CHECK-IN', 'URGE LOG', 'LOOPS CLOSED', 'RECEIPTS', 'THE DAY', 'THE BREATH', 'BOOKENDS', 'CO-REGULATION', 'THE TAPE', 'SCENE LAST', 'RECEIVING WINDOW', 'THE LAST SEVEN DAYS']) {
  check(`panel: ${eyebrow}`, await page.locator(`text=${eyebrow}`).count() >= 1)
}
check('empty history reads "Nothing logged yet. Small counts."', await page.locator('text=Small counts').count() === 1)

/* 2 · state check-in */
await page.locator('input[placeholder*="underneath"]').fill('rent email arrived')
await page.locator('button', { hasText: 'Charged' }).first().click()
await page.waitForSelector('text=✓ Charged')
check('state button confirms on the button itself', true)
await page.waitForSelector('text=set-point defending itself')
check('truth line renders instantly (no model call)', true)
check('today line shows the state', (await page.locator('text=Today: charged').count()) === 1)

/* 3 · urge log */
await page.locator('button', { hasText: 'Talk myself into less' }).click()
check('pull hint appears once selected', await page.locator('text=Accept the bad fit').count() >= 1)
await page.locator('input[placeholder*="often it\'s something good"]').fill('a real offer came in')
await page.locator('button', { hasText: 'Named it and rode it out' }).click()
await page.locator('label:has-text("someone safe") input').check()
await page.locator('button', { hasText: 'Log the urge' }).click()
await page.waitForSelector('text=reflection', { timeout: 10000 })
await page.waitForSelector('text=set-point talking')
check('urge reflection renders under the log button', true)
const req = await page.evaluate(() => window.__lastReflectionRequest)
check('reflection request used practice mode', Boolean(req?.practice?.entry))
check('request carried the pull', req?.practice?.entry?.includes('Talk myself into less'))
check('request carried the trigger verbatim', req?.practice?.entry?.includes('a real offer came in'))
check('request carried the bookend', req?.practice?.entry?.includes('someone safe'))
check('request carried the day state', req?.practice?.entry?.includes('Charged'))
check('reflection request carries the recovery context', req?.practice?.context?.includes('trends, not a diary'))

/* 4 · loops */
await page.locator('button', { hasText: 'One boundary held' }).click()
await page.waitForSelector('text=✓ Closed')
check('loop preset confirms', true)
check('loop appears in today list', await page.locator('text=✓ One boundary held').count() >= 1)

/* 4b · receipts */
await page.locator('input[placeholder="What\'s the proof?"]').fill('let the good news land without moving')
await page.locator('button', { hasText: 'Keep it' }).click()
await page.waitForSelector('text=● let the good news land without moving')
check('receipt logs and renders in today list', true)

/* 4c · the day — anchor + return */
await page.locator('button', { hasText: 'Anchored — the morning practice happened' }).click()
await page.waitForSelector('text=● Anchor kept this morning.')
check('anchor collapses to one-bit done state', true)
check('anchor button gone once kept', (await page.locator('button', { hasText: 'Anchored —' }).count()) === 0)

check('return disabled while empty', await page.locator('button:has-text("Log the return")').isDisabled())
await page.locator('input[placeholder*="Naming, not prosecuting"]').fill('went vague on the pricing email')
await page.locator('input[placeholder*="counting the misses"]').fill('made the outreach call')
await page.locator('button', { hasText: 'Log the return' }).click()
await page.waitForFunction(() => window.__lastReflectionRequest?.practice?.kind === 'return')
const retReq = await page.evaluate(() => window.__lastReflectionRequest)
check('return reflection request used kind return', retReq?.practice?.kind === 'return')
check('return request carried both fields verbatim',
  retReq?.practice?.entry?.includes('went vague on the pricing email')
  && retReq?.practice?.entry?.includes('made the outreach call'))
await page.waitForSelector('text=your old accounting would have skipped')
check('return reflection renders (distinct from the urge one)', true)

/* 5 · counters — the personal layer */
await page.locator('button', { hasText: 'Your counter-lines' }).click()
await page.waitForSelector('text=One line per state')
check('counter editor opens', true)
await page.locator('input[placeholder="Your own counter-line for this state"]').nth(2).fill('hard done by pays in poison — the receipt is fake')
await page.locator('button', { hasText: 'Keep the counter-lines' }).click()
await page.waitForSelector('text=hard done by pays in poison')
check('counter saves and renders under the truth line', true)
const counterItalic = await page.locator('p', { hasText: 'hard done by pays in poison' }).first().evaluate((el) => getComputedStyle(el).fontStyle)
check('counter renders in italic (user-authored words)', counterItalic === 'italic')

/* 6 · the breath */
await page.locator('button', { hasText: 'two minutes is the dose' }).click()
await page.waitForSelector('text=Breathe in, easy')
check('breath pacing starts on the easy inhale', true)
check('pectus caution always rendered', (await page.locator('text=never force the chest').count()) === 1)
await page.waitForTimeout(1600)
await page.locator('button:has-text("Done")').click()
await page.locator('button', { hasText: 'Keep the session' }).click()
await page.waitForSelector('text=breath · 1 min')
check('a kept breath session lands in history as minutes', true)

/* 7 · bookends — the pair */
await page.locator('input[placeholder*="about to do"]').fill('send the retainer invoice')
await page.locator('button', { hasText: 'open the bookend' }).click()
await page.waitForSelector('text=Urges logged while this is open')
check('bookend opens and shows its action', await page.locator('text=send the retainer invoice').count() >= 1)

await page.locator('button', { hasText: 'Go vague' }).click()
await page.locator('button', { hasText: 'Still in it right now' }).click()
await page.locator('button', { hasText: 'Log the urge' }).click()
await page.waitForFunction(() => window.__lastReflectionRequest?.practice?.entry?.includes('mid-bookend'))
const bkReq = await page.evaluate(() => window.__lastReflectionRequest)
check('urge inside a bookend names the open action', bkReq?.practice?.entry?.includes('send the retainer invoice'))

await page.locator('input[placeholder*="however it went"]').fill('sent it anyway')
await page.locator('button:has-text("Both")').click()
await page.locator('button', { hasText: 'Close the bookend' }).click()
await page.waitForSelector('input[placeholder*="about to do"]')
check('closing the bookend returns the panel to its open form', true)
check('closed bookend lands in history', await page.locator('text=bookend closed · sent it anyway').count() >= 1)

/* 8 · co-regulation + the month's number */
await page.locator('input[placeholder*="a safe friend"]').fill('call with a program friend')
await page.locator('button', { hasText: 'Log the dose' }).click()
await page.waitForSelector('text=Last dose: today')
check('co-reg dose logs and the presence line updates', true)
await page.locator('input[placeholder*="breaths/min at rest"]').fill('13 breaths/min at rest')
await page.locator('button', { hasText: 'Keep the number' }).click()
await page.waitForSelector('text=· 13 breaths/min at rest')
check('the monthly proxy logs and renders as a plain sentence', true)

/* 9 · scene last */
await page.locator('input[placeholder*="Where the move the urge wants actually ends"]').fill('The invoice never goes out and the month ends short.')
await page.locator('button', { hasText: 'Save scene last' }).click()
await page.waitForSelector('button:has-text("✓ Saved")')
await page.waitForSelector('p:has-text("The invoice never goes out and the month ends short.")')
const sceneItalic = await page.locator('p', { hasText: 'The invoice never goes out and the month ends short.' }).first().evaluate((el) => getComputedStyle(el).fontStyle)
check('scene last renders in italic (user-authored words)', sceneItalic === 'italic')

/* 10 · the tape */
await page.locator('textarea[placeholder*="whole film"]').fill('Scene two: the invoice never goes out. Scene three: the missed wedding.')
await page.locator('button', { hasText: 'Save the tape' }).click()
await page.waitForSelector('button:has-text("✓ Saved")')
const tapeItalic = await page.locator('p', { hasText: 'Scene two' }).first().evaluate((el) => getComputedStyle(el).fontStyle)
check('saved tape renders in italic (user-authored words)', tapeItalic === 'italic')

/* 11 · receiving window */
check('no banner before a window opens', (await page.locator('text=Receiving window open').count()) === 0)
await page.locator('input[placeholder*="What landed"]').fill('a yes on the pitch')
await page.locator('button', { hasText: 'open the window' }).click()
await page.waitForSelector('text=Receiving window open')
check('banner appears once open', true)
check('banner carries the note and the frame', await page.locator('text=withdrawal, not truth').count() >= 1)
check('about 48h left', await page.locator('text=48h left').count() >= 1)
await page.locator('button', { hasText: 'close the window' }).click()
await page.waitForFunction(() => !document.body.textContent.includes('Receiving window open'))
check('closing the window clears the banner', true)

/* 12 · history + absences */
check('history shows TODAY', await page.locator('text=TODAY').count() >= 1)
check('history carries the urge line', await page.locator('text=urge · talk myself into less').count() >= 1)
const bodyText = await page.evaluate(() => document.body.textContent)
check('no streak language anywhere', !/streak of|day streak|\d+ days in a row/i.test(bodyText))
check('no page errors', errors.length === 0)
if (errors.length) console.log(errors.join('\n'))

await page.screenshot({ path: path.join(here, 'practice-page.png'), fullPage: true })

await browser.close()
server.close()

const failed = results.filter(([, ok]) => !ok)
console.log(`\n${results.length - failed.length}/${results.length} harness checks pass.`)
process.exit(failed.length ? 1 : 0)
