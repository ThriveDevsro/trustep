import { LegalPage } from '@/components/LegalPage'

const listClass = 'list-disc space-y-2 pl-5'

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Ochrana súkromia"
      intro="Tieto zásady vysvetľujú, aké osobné údaje TrustStep spracúva, prečo ich potrebuje a aké práva máte pri používaní webu, účtu a bezpečnostných analýz"
      sections={[
        {
          title: 'Kto spracúva vaše údaje',
          content: (
            <>
              <p>Prevádzkovateľom služby je TrustStep. Úplné obchodné meno, sídlo a identifikačné údaje budú doplnené pred verejným komerčným spustením služby.</p>
              <p>Otázky a žiadosti týkajúce sa osobných údajov môžete poslať na <a href="mailto:privacy@truststep.sk" className="font-bold text-[#111827] underline">privacy@truststep.sk</a>.</p>
            </>
          ),
        },
        {
          title: 'Aké údaje spracúvame',
          content: (
            <ul className={listClass}>
              <li>údaje účtu, napríklad meno, e-mail, firma a prihlasovací identifikátor,</li>
              <li>obsah, ktorý dobrovoľne odošlete na analýzu, napríklad text správy, URL, screenshot, e-mail alebo zvukový záznam,</li>
              <li>výsledok analýzy, stav incidentu a základnú históriu aktivít v účte,</li>
              <li>technické údaje potrebné na bezpečnosť a prevádzku, napríklad čas požiadavky, IP adresa, typ zariadenia a chybové logy,</li>
              <li>kontaktné údaje z formulárov pre firemný pilot alebo podporu.</li>
            </ul>
          ),
        },
        {
          title: 'Prečo údaje používame',
          content: (
            <ul className={listClass}>
              <li>na poskytnutie analýzy a zobrazenie výsledku,</li>
              <li>na vytvorenie účtu, autentifikáciu a správu firemného pracovného priestoru,</li>
              <li>na detekciu zneužitia, riešenie incidentov a ochranu služby,</li>
              <li>na odpoveď na dopyt alebo podporu,</li>
              <li>na splnenie právnych povinností a preukazovanie bezpečnosti služby.</li>
            </ul>
          ),
        },
        {
          title: 'Právne základy',
          content: (
            <p>Údaje spracúvame najmä preto, že je to potrebné na plnenie zmluvy alebo vykonanie krokov pred jej uzavretím. Bezpečnostné logy a ochranu pred zneužitím môžeme spracúvať na základe oprávneného záujmu. Ak je pre konkrétne spracúvanie potrebný súhlas, môžete ho kedykoľvek odvolať bez vplyvu na zákonnosť predchádzajúceho spracúvania.</p>
          ),
        },
        {
          title: 'Komu môžu byť údaje sprístupnené',
          content: (
            <>
              <p>Na prevádzke sa môžu podieľať poskytovatelia hostingu, databáz, autentifikácie, e-mailovej komunikácie, bezpečnostného monitoringu a AI analýzy. Títo partneri môžu údaje spracúvať iba podľa našich pokynov a zmluvných podmienok.</p>
              <p>Pred komerčným spustením zverejníme aktuálny zoznam hlavných sprostredkovateľov vrátane krajiny spracúvania a mechanizmu prípadného prenosu mimo EHP.</p>
            </>
          ),
        },
        {
          title: 'Ako dlho údaje uchovávame',
          content: (
            <p>Údaje účtu uchovávame počas jeho existencie a primeraný čas po jeho zrušení, ak je to potrebné na splnenie právnych povinností alebo riešenie sporov. Obsah analýz a technické logy uchovávame iba počas obdobia potrebného na poskytnutie funkcie, bezpečnosť a zvolenú históriu účtu. Konkrétne retenčné lehoty budú pred produkčným spustením doplnené podľa finálnej infraštruktúry.</p>
          ),
        },
        {
          title: 'Vaše práva',
          content: (
            <>
              <p>V rozsahu stanovenom GDPR môžete žiadať prístup k údajom, opravu, vymazanie, obmedzenie spracúvania, prenosnosť údajov alebo namietať proti spracúvaniu. Žiadosť pošlite na privacy@truststep.sk.</p>
              <p>Máte tiež právo podať návrh na začatie konania na Úrade na ochranu osobných údajov Slovenskej republiky. Prevádzkovateľ má žiadosť spravidla vybaviť najneskôr do jedného mesiaca.</p>
            </>
          ),
        },
        {
          title: 'Bezpečnosť a citlivý obsah',
          content: (
            <p>Používame primerané technické a organizačné opatrenia na ochranu údajov. Do analýzy nevkladajte heslá, celé čísla platobných kariet, zdravotné údaje ani iné údaje, ktoré nie sú potrebné na posúdenie rizika. Žiadna internetová služba však nedokáže zaručiť absolútnu bezpečnosť.</p>
          ),
        },
        {
          title: 'Zmeny týchto zásad',
          content: (
            <p>Zásady môžeme aktualizovať pri zmene služby, infraštruktúry alebo právnych požiadaviek. Aktuálna verzia bude vždy dostupná na tejto stránke s dátumom poslednej aktualizácie.</p>
          ),
        },
      ]}
    />
  )
}
