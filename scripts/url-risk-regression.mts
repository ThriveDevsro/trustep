import assert from 'node:assert/strict'
import { applyUrlRiskOverrides, buildUrlHeuristics, extractPageInfo } from '../lib/url-risk.ts'

const redirectScamUrl = 'https://broverrys.com/?826789a0236e92fcc527847dae9f4816=%7B%7Bcampaign.name%7D%7D&c64d6dd09a191fbaef1a3e6587decac4=Facebook_Mobile_Feed&d7f5d73801f4196f00e6c5b31f8d27351a2df8a8b59a9a7470732eccc9b01c1c=36d1e7e4beab6fd117effac6749b075b8fb417c20b0051a2c74fed658a30f9c47057225be44cd733e074e1a6cc3eb5a9b8490c0ccc9a7ee447eb6953abc09b7da2f9ef18b543830ce9b5b8ed3f20ba97&9338c9f1b1cc977d871a27b23e91cbe7=%7B%7Bcampaign.id%7D%7D&eeaa99e26109e6f8c28724266bde520b=120253311386150583&70b2e68650ac146c22742634aa42cafc=sk_g3_8845&1bcb8b2bfc7a5311a532498e696dc90f=%7B%7Badset.id%7D%7D&f550d3d2ea4b372eb821228d0c5b43a5=%7B%7Badset.name%7D%7D'

const redirectScamHtml = `
<!doctype html>
<html lang="en-GB">
  <head>
    <title>Homepage - Barker Poland</title>
  </head>
  <body>
    <section>
      <h1>Financial consulting in Slovakia</h1>
      <p>Investment guidance, broker onboarding and profit opportunities.</p>
      <form>
        <input type="text" name="name" />
        <input type="email" name="email" />
        <input type="tel" name="phone" />
      </form>
    </section>
  </body>
</html>
`

const safeHtml = `
<!doctype html>
<html lang="en">
  <head>
    <title>Example Domain</title>
  </head>
  <body>
    <h1>Example Domain</h1>
    <p>This domain is for use in illustrative examples in documents.</p>
  </body>
</html>
`

const scamInfo = extractPageInfo(redirectScamHtml, 'https://www.barkerpoland.co.uk/')
const scamHeuristics = buildUrlHeuristics(redirectScamUrl, 'https://www.barkerpoland.co.uk/', scamInfo)
const scamResult = applyUrlRiskOverrides(
  { riskLevel: 'low', reasons: ['Model zatiaľ nenašiel veľa signálov.'], recommendation: 'Pokračovať opatrne.' },
  scamHeuristics,
)

assert.equal(scamHeuristics.redirectedToUnrelatedDomain, true)
assert.equal(scamHeuristics.hasAggressiveTrackingPattern, true)
assert.equal(scamHeuristics.hasLocaleMismatch, true)
assert.ok(scamHeuristics.score >= 8, `Expected scam score >= 8, got ${scamHeuristics.score}`)
assert.equal(scamResult.riskLevel, 'high')

const safeInfo = extractPageInfo(safeHtml, 'https://example.com/')
const safeHeuristics = buildUrlHeuristics('https://example.com/', 'https://example.com/', safeInfo)
const safeResult = applyUrlRiskOverrides(
  { riskLevel: 'low', reasons: ['Bez zjavne podozrivých prvkov.'], recommendation: 'Pokračovať opatrne.' },
  safeHeuristics,
)

assert.equal(safeHeuristics.score, 0)
assert.equal(safeResult.riskLevel, 'low')

console.log('url-risk regression passed')
