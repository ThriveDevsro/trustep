import assert from 'node:assert/strict'
import { applyUrlRiskOverrides, buildUrlHeuristics, extractPageInfo } from '../lib/url-risk.ts'
import { assertSafeRemoteUrl } from '../lib/url-security.ts'
import { applyPaymentFraudOverrides } from '../lib/payment-fraud.ts'
import { analyzeContentRisk } from '../lib/content-risk.ts'

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

const legitimateFinanceHtml = `
<!doctype html>
<html lang="sk">
  <head><title>Národná banka Slovenska – upozornenia pre spotrebiteľov</title></head>
  <body>
    <main><h1>Upozornenia pre spotrebiteľov</h1><p>Overte si poskytovateľa investičných služieb v registri.</p></main>
  </body>
</html>
`

const impersonationHtml = `
<!doctype html>
<html lang="sk">
  <head><title>Exkluzívna investícia odporúčaná ministrom</title></head>
  <body>
    <h1>Zaručený výnos z kryptomeny už dnes</h1>
    <p>Minister vám prináša tajnú investíciu. Zaregistrujte sa a vložte prvý vklad.</p>
    <form><input name="name" /><input name="email" /><input name="phone" /></form>
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
assert.ok(scamResult.reasons.some((reason) => /presmerovala|redirect/i.test(reason)), 'High risk needs an explainable redirect signal')

const safeInfo = extractPageInfo(safeHtml, 'https://example.com/')
const safeHeuristics = buildUrlHeuristics('https://example.com/', 'https://example.com/', safeInfo)
const safeResult = applyUrlRiskOverrides(
  { riskLevel: 'low', reasons: ['Bez zjavne podozrivých prvkov.'], recommendation: 'Pokračovať opatrne.' },
  safeHeuristics,
)

assert.equal(safeHeuristics.score, 0)
assert.equal(safeResult.riskLevel, 'low')

// The generic message model is intentionally cautious around links. A benign
// URL must remain low risk even if that model would have returned a warning.
const safeModelWarningResult = applyUrlRiskOverrides(
  { riskLevel: 'high', reasons: ['Model označil samotný odkaz ako podozrivý.'], recommendation: 'Neotvárajte odkaz.' },
  safeHeuristics,
)
assert.equal(safeModelWarningResult.riskLevel, 'low')
assert.ok(!safeModelWarningResult.reasons.some((reason) => /model/i.test(reason)))

const legitimateInfo = extractPageInfo(legitimateFinanceHtml, 'https://nbs.sk/upozornenia')
const legitimateHeuristics = buildUrlHeuristics('https://nbs.sk/upozornenia', 'https://nbs.sk/upozornenia', legitimateInfo)
const legitimateResult = applyUrlRiskOverrides(
  { riskLevel: 'low', reasons: ['Informačný obsah bez výzvy na platbu.'], recommendation: 'Overte zdroj v oficiálnom registri.' },
  legitimateHeuristics,
)

assert.equal(legitimateHeuristics.hasFinanceLanguage, true)
assert.ok(legitimateHeuristics.score <= 1, `Legitimate financial education must not be escalated, got ${legitimateHeuristics.score}`)
assert.equal(legitimateResult.riskLevel, 'low')

const impersonationInfo = extractPageInfo(impersonationHtml, 'https://invest-now.example/bonus')
const impersonationHeuristics = buildUrlHeuristics('https://invest-now.example/bonus', 'https://invest-now.example/bonus', impersonationInfo)
const impersonationResult = applyUrlRiskOverrides(
  { riskLevel: 'medium', reasons: ['Obsah obsahuje investičnú ponuku.'], recommendation: 'Buďte opatrní.' },
  impersonationHeuristics,
)

assert.equal(impersonationHeuristics.hasPublicFigureLanguage, true)
assert.equal(impersonationHeuristics.hasLeadGenForm, true)
assert.ok(impersonationHeuristics.score >= 6, `Expected strong impersonation evidence, got ${impersonationHeuristics.score}`)
assert.equal(impersonationResult.riskLevel, 'high')

const easyParkLoginHtml = `
<!doctype html>
<html lang="en"><head><title>EasyPark account</title></head>
<body><form><input name="username" /><input type="password" name="password" /></form></body></html>
`
const easyParkInfo = extractPageInfo(easyParkLoginHtml, 'https://dashbord-easypark.it-dues.com/login')
const easyParkHeuristics = buildUrlHeuristics('https://dashbord-easypark.it-dues.com/login', 'https://dashbord-easypark.it-dues.com/login', easyParkInfo)
const easyParkResult = applyUrlRiskOverrides(
  { riskLevel: 'low', reasons: ['Model bez ďalšieho kontextu.'], recommendation: 'Pokračovať opatrne.' },
  easyParkHeuristics,
)

assert.equal(easyParkHeuristics.impersonatedBrand, 'EasyPark')
assert.ok(easyParkHeuristics.score >= 4, `Expected brand impersonation score, got ${easyParkHeuristics.score}`)
assert.equal(easyParkResult.riskLevel, 'high')
assert.ok(easyParkResult.reasons.some((reason) => /EasyPark/.test(reason)), 'Brand impersonation must be explained')

const microsoftClaimHtml = `
<!doctype html><html lang="en"><head><title>Microsoft account verification</title></head>
<body><h1>Microsoft account</h1><form><input name="username" /><input type="password" name="password" /></form></body></html>
`
const microsoftClaimInfo = extractPageInfo(microsoftClaimHtml, 'https://identity-check.example/login')
const microsoftClaimHeuristics = buildUrlHeuristics('https://identity-check.example/login', 'https://identity-check.example/login', microsoftClaimInfo)
const microsoftClaimResult = applyUrlRiskOverrides({ riskLevel: 'low', reasons: [], recommendation: '' }, microsoftClaimHeuristics)
assert.equal(microsoftClaimHeuristics.officialDomainChecks[0]?.status, 'mismatch')
assert.equal(microsoftClaimResult.riskLevel, 'high')
assert.ok(microsoftClaimResult.reasons.some((reason) => /microsoft\.com/i.test(reason)), 'The result must show the official domain comparison')

const paymentChangeResult = applyPaymentFraudOverrides(
  { riskLevel: 'low', reasons: ['Model nevidí technické riziko.'], recommendation: 'Pokračovať opatrne.' },
  'Urgentne zmeňte IBAN dodávateľa na SK31 1200 0000 1987 4263 7541 a uhradte faktúru dnes.',
)

assert.equal(paymentChangeResult.riskLevel, 'high')
assert.ok(paymentChangeResult.reasons.some((reason) => /IBAN/.test(reason)), 'Payment change must be explained')
assert.match(paymentChangeResult.recommendation, /Zastavte platbu/)

await assert.rejects(() => assertSafeRemoteUrl('http://127.0.0.1:3000/admin'))
await assert.rejects(() => assertSafeRemoteUrl('http://[::1]/'))
await assert.rejects(() => assertSafeRemoteUrl('http://[::ffff:127.0.0.1]/'))
await assert.rejects(() => assertSafeRemoteUrl('http://169.254.169.254/latest/meta-data/'))
await assert.rejects(() => assertSafeRemoteUrl('file:///etc/passwd'))

const ordinaryLink = analyzeContentRisk('Pozri si našu novú stránku https://example.com. Ďakujeme.')
assert.equal(ordinaryLink.riskLevel, 'low', 'A link alone must not produce a warning')

const ordinaryBankNotice = analyzeContentRisk('Banka oznamuje zmenu otváracích hodín pobočky.')
assert.equal(ordinaryBankNotice.riskLevel, 'low', 'A brand name alone must not produce a warning')

const credentialPhishing = analyzeContentRisk('Vaša karta bude zablokovaná dnes. Prihláste sa cez https://fake-bank.example a zadajte OTP kód.')
assert.equal(credentialPhishing.riskLevel, 'high')
assert.ok(credentialPhishing.reasons.some((reason) => /odkaz.*prihlásenie|odkaz.*citlivé/i.test(reason)))

const ibanChange = analyzeContentRisk('Prosím urgentne zmeňte IBAN na SK31 1200 0000 1987 4263 7541 a uhraďte faktúru dnes.')
assert.equal(ibanChange.riskLevel, 'high')

const parcelPaymentPhishing = analyzeContentRisk('Slovenská pošta: Vaša zásielka čaká na doručenie. Zaplaťte poplatok 1,99 € tu: https://posta-dorucenie-pay.example')
assert.equal(parcelPaymentPhishing.riskLevel, 'medium', 'A parcel-payment link needs manual verification, not an automatic scam verdict')

const newNumberMoneyScam = analyzeContentRisk('Ahoj mama, mám nové číslo. Pošli mi prosím 300 € hneď na účet SK12 1234 5678 9012 3456.')
assert.equal(newNumberMoneyScam.riskLevel, 'high', 'New-number money requests must require immediate verification')
assert.ok(newNumberMoneyScam.reasons.some((reason) => /novým číslom|známe číslo/i.test(reason)))

console.log('url-risk regression passed')
