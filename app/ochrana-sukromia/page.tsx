import { LegalPage } from '@/components/LegalPage'

const listClass = 'list-disc space-y-2 pl-5'

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Ochrana osobných údajov"
      intro="Tu nájdete zrozumiteľné informácie o tom, ktoré údaje FeelsOdd spracúva pri registrácii, bezpečnostnej analýze a pripojení e-mailovej schránky, na aký účel ich používa a ako môžete uplatniť svoje práva."
      sections={[
        {
          title: '1. Prevádzkovateľ a kontakt',
          content: (
            <>
              <p><strong className="text-[#111827]">Prevádzkovateľ:</strong> FeelsOdd, Slovenská republika.</p>
              <p>Pre otázky, uplatnenie práv alebo oznámenie bezpečnostného incidentu napíšte na <a href="mailto:privacy@truststep.sk" className="font-bold text-[#111827] underline">privacy@truststep.sk</a>.</p>
              <p>Ak bude určená zodpovedná osoba podľa GDPR, jej kontaktné údaje zverejníme v tejto časti.</p>
            </>
          ),
        },
        {
          title: '2. Aké údaje spracúvame',
          content: (
            <ul className={listClass}>
              <li><strong className="text-[#111827]">Účet:</strong> meno, e-mailová adresa, identifikátor používateľa, poskytovateľ prihlásenia a názov účtu alebo organizácie.</li>
              <li><strong className="text-[#111827]">Obsah analýzy:</strong> text správy, URL, e-mailový súbor, screenshot, fotografia, zvuková nahrávka a automaticky vytvorený prepis.</li>
              <li><strong className="text-[#111827]">Výsledok:</strong> úroveň rizika, zistené signály, odporúčanie, zdroj podnetu, čas analýzy a stav incidentu.</li>
              <li><strong className="text-[#111827]">Pripojená schránka:</strong> e-mailová adresa, poskytovateľ, stav spojenia, režim kontroly a údaje potrebné na bezpečné technické prepojenie.</li>
              <li><strong className="text-[#111827]">Prevádzkové údaje:</strong> údaje o relácii, čas požiadavky, technické logy, chybové hlásenia a bezpečnostné udalosti.</li>
              <li><strong className="text-[#111827]">Komunikácia:</strong> údaje, ktoré uvediete pri žiadosti o podporu alebo firemný pilot.</li>
            </ul>
          ),
        },
        {
          title: '3. Odkiaľ údaje získavame',
          content: (
            <>
              <p>Väčšinu údajov získavame priamo od vás pri registrácii, odoslaní podnetu alebo spojení schránky. Pri prihlásení cez Google alebo Microsoft dostaneme iba údaje povolené v prihlasovacom procese.</p>
              <p>Obsah, ktorý odošlete na analýzu, môže obsahovať údaje inej osoby, napríklad odosielateľa e-mailu alebo volajúceho. Odosielajte iba obsah, ku ktorému máte oprávnený prístup, a pred odoslaním odstráňte údaje, ktoré nie sú potrebné na posúdenie podvodu.</p>
            </>
          ),
        },
        {
          title: '4. Účely a právne základy',
          content: (
            <ul className={listClass}>
              <li><strong className="text-[#111827]">Poskytnutie služby a správa účtu</strong> — plnenie zmluvy alebo kroky pred jej uzavretím podľa čl. 6 ods. 1 písm. b) GDPR.</li>
              <li><strong className="text-[#111827]">Analýza podvodu a uloženie výsledku</strong> — plnenie zmluvy; pri firemnom nasadení môže FeelsOdd vystupovať ako sprostredkovateľ podľa pokynov klienta.</li>
              <li><strong className="text-[#111827]">Bezpečnosť, prevencia zneužitia a diagnostika</strong> — oprávnený záujem na ochrane používateľov a služby podľa čl. 6 ods. 1 písm. f) GDPR.</li>
              <li><strong className="text-[#111827]">Podpora a firemný pilot</strong> — kroky pred uzavretím zmluvy alebo oprávnený záujem odpovedať na dopyt.</li>
              <li><strong className="text-[#111827]">Plnenie zákonných povinností</strong> — čl. 6 ods. 1 písm. c) GDPR, ak uchovanie alebo poskytnutie údajov vyžaduje zákon.</li>
              <li><strong className="text-[#111827]">Voliteľné spracúvanie</strong> — súhlas podľa čl. 6 ods. 1 písm. a) GDPR, ak si ho konkrétna funkcia vyžiada. Súhlas môžete kedykoľvek odvolať.</li>
            </ul>
          ),
        },
        {
          title: '5. Automatizovaná analýza',
          content: (
            <>
              <p>FeelsOdd používa automatizované pravidlá a modely umelej inteligencie na rozpoznanie podvodných signálov. Výsledok je odporúčanie pre používateľa, nie právne záväzné rozhodnutie a sám osebe nemá voči vám právny ani obdobne významný účinok.</p>
              <p>Automatizovaný výsledok môže byť neúplný alebo nesprávny. Pri platbe, odovzdaní údajov alebo inom významnom kroku si informáciu vždy overte nezávislým kanálom.</p>
            </>
          ),
        },
        {
          title: '6. Príjemcovia a poskytovatelia',
          content: (
            <>
              <p>Údaje nesprístupňujeme na predaj ani na behaviorálnu reklamu. Podľa použitej funkcie ich môžu v nevyhnutnom rozsahu spracúvať naši poskytovatelia:</p>
              <ul className={listClass}>
                <li>Supabase pre databázu, autentifikáciu a uloženie účtu,</li>
                <li>Groq a podľa konfigurácie OpenAI pre textovú, obrazovú alebo zvukovú analýzu,</li>
                <li>Resend pre servisné e-maily a spracovanie prichádzajúcej pošty,</li>
                <li>Google alebo Microsoft pri dobrovoľnom prihlásení alebo pripojení schránky,</li>
                <li>Twilio pri funkciách telefonickej integrácie, ak sú aktivované,</li>
                <li>poskytovateľ hostingu, monitoringu a technickej podpory.</li>
              </ul>
              <p>Poskytovateľov zaväzujeme spracúvať údaje iba na dohodnutý účel a s primeranou úrovňou bezpečnosti.</p>
            </>
          ),
        },
        {
          title: '7. Prenosy mimo EHP',
          content: (
            <p>Niektorí technologickí poskytovatelia môžu spracúvať údaje mimo Európskeho hospodárskeho priestoru. V takom prípade sa prenos uskutočňuje iba pri existencii primeraného právneho mechanizmu, napríklad rozhodnutia Európskej komisie o primeranosti alebo štandardných zmluvných doložiek, a po posúdení potrebných doplnkových opatrení.</p>
          ),
        },
        {
          title: '8. Ako dlho údaje uchovávame',
          content: (
            <ul className={listClass}>
              <li>Údaje účtu uchovávame počas aktívneho účtu a následne iba v rozsahu potrebnom na zákonné povinnosti alebo riešenie nárokov.</li>
              <li>Obsah a výsledky analýz zostávajú v histórii, kým ich alebo účet nevymažete, prípadne kým neuplynie lehota dohodnutá vo firemnom pláne.</li>
              <li>Dočasný obsah prijatý cez systémové zdieľanie sa automaticky odstráni približne po 15 minútach, ak sa neuloží ako analýza.</li>
              <li>Údaje spojenia e-mailovej schránky uchovávame do jej odpojenia alebo zrušenia účtu.</li>
              <li>Bezpečnostné a chybové logy uchovávame iba počas obdobia primeraného účelu, pre ktorý vznikli.</li>
            </ul>
          ),
        },
        {
          title: '9. Vaše práva',
          content: (
            <>
              <p>Podľa okolností máte právo na informácie, prístup k údajom, opravu, vymazanie, obmedzenie spracúvania, prenosnosť údajov, odvolanie súhlasu a namietanie proti spracúvaniu založenému na oprávnenom záujme.</p>
              <p>Žiadosť pošlite na <a href="mailto:privacy@truststep.sk" className="font-bold text-[#111827] underline">privacy@truststep.sk</a>. Môžeme si primeraným spôsobom overiť vašu totožnosť. Odpovieme spravidla do jedného mesiaca; ak GDPR umožňuje predĺženie, včas vás informujeme.</p>
              <p>Máte právo podať návrh na začatie konania na <a href="https://www.dataprotection.gov.sk/" target="_blank" rel="noreferrer" className="font-bold text-[#111827] underline">Úrade na ochranu osobných údajov Slovenskej republiky</a>.</p>
            </>
          ),
        },
        {
          title: '10. Bezpečnosť a minimalizácia údajov',
          content: (
            <>
              <p>Používame primerané technické a organizačné opatrenia zamerané na dôvernosť, integritu a dostupnosť údajov, riadenie prístupov a bezpečný prenos.</p>
              <p>Do FeelsOdd neposielajte heslá, PIN alebo autorizačné kódy, celé čísla platobných kariet, zdravotné údaje ani iný citlivý obsah, ak nie je nevyhnutný na preverenie situácie. Takéto údaje pred odoslaním prekryte alebo odstráňte.</p>
            </>
          ),
        },
        {
          title: '11. Cookies a lokálne úložisko',
          content: (
            <p>Služba používa technické cookies alebo lokálne úložisko potrebné na prihlásenie, zachovanie relácie, bezpečnosť a fungovanie aplikácie. V súčasnosti ich nepoužívame na behaviorálnu reklamu. Ak pridáme nepovinnú analytiku alebo marketingové cookies, zobrazíme samostatnú možnosť voľby.</p>
          ),
        },
        {
          title: '12. Zmeny zásad',
          content: (
            <>
              <p>Zásady aktualizujeme pri zmene funkcií, poskytovateľov alebo právnych požiadaviek. Pri významnej zmene primerane upozorníme používateľov a na stránke uvedieme nový dátum účinnosti.</p>
              <p>Text vychádza z informačných povinností podľa článkov 13 a 14 <a href="https://eur-lex.europa.eu/legal-content/SK/TXT/?uri=CELEX:32016R0679" target="_blank" rel="noreferrer" className="font-bold text-[#111827] underline">GDPR</a>.</p>
            </>
          ),
        },
      ]}
    />
  )
}
