import { LegalPage } from '@/components/LegalPage'

const listClass = 'list-disc space-y-2 pl-5'

export default function TermsPage() {
  return (
    <LegalPage
      title="Podmienky používania"
      intro="Tieto podmienky upravujú používanie webu, používateľského účtu a bezpečnostných analytických funkcií TrustStep"
      sections={[
        {
          title: 'Poskytovateľ služby',
          content: (
            <>
              <p>Službu poskytuje TrustStep. Úplné obchodné meno, sídlo, IČO, zápis v registri a kontaktné údaje budú doplnené pred verejným komerčným spustením.</p>
              <p>Kontakt pre otázky k službe: <a href="mailto:hello@truststep.sk" className="font-bold text-[#111827] underline">hello@truststep.sk</a>.</p>
            </>
          ),
        },
        {
          title: 'Čo TrustStep poskytuje',
          content: (
            <p>TrustStep analyzuje používateľom zadané správy, odkazy, súbory a ďalší obsah s cieľom upozorniť na možné známky phishingu, podvodu alebo manipulatívnej komunikácie. Dostupné funkcie sa môžu líšiť podľa zvoleného plánu.</p>
          ),
        },
        {
          title: 'Výsledok nie je záruka',
          content: (
            <p>Výsledok analýzy je podporná informácia, nie právne, finančné ani odborné bezpečnostné stanovisko. Služba môže riziko prehliadnuť alebo označiť legitímny obsah ako podozrivý. Pred platbou, zadaním prihlasovacích údajov alebo iným významným krokom si informáciu overte nezávislým kanálom.</p>
          ),
        },
        {
          title: 'Účet a prístup',
          content: (
            <ul className={listClass}>
              <li>pri registrácii musíte uviesť pravdivé a aktuálne údaje,</li>
              <li>zodpovedáte za ochranu svojich prihlasovacích údajov a aktivitu vo svojom účte,</li>
              <li>podozrenie na neoprávnený prístup nám oznámte bez zbytočného odkladu,</li>
              <li>firemný administrátor môže spravovať členov a údaje pracovného priestoru podľa nastavených oprávnení.</li>
            </ul>
          ),
        },
        {
          title: 'Povolené používanie',
          content: (
            <>
              <p>Službu môžete používať iba zákonným spôsobom a na analýzu obsahu, ku ktorému máte oprávnený prístup.</p>
              <p>Je zakázané službu zneužívať na útoky, obchádzanie zabezpečenia, neoprávnené monitorovanie osôb, šírenie škodlivého obsahu, automatizované preťažovanie alebo testovanie zraniteľností bez písomného súhlasu.</p>
            </>
          ),
        },
        {
          title: 'Obsah používateľa',
          content: (
            <p>K svojmu obsahu si ponechávate práva. Poskytujete nám iba obmedzené oprávnenie spracovať ho v rozsahu potrebnom na vykonanie analýzy, zabezpečenie služby a splnenie zákonných povinností. Zodpovedáte za to, že odoslaním obsahu neporušujete práva iných osôb ani povinnosť mlčanlivosti.</p>
          ),
        },
        {
          title: 'Plány, ceny a platby',
          content: (
            <p>Cena, fakturačné obdobie, limity a obsah plánu sú uvedené pri objednávke. Podmienky platených plánov, spôsob obnovy predplatného, dane, možnosti zrušenia a pravidlá pre spotrebiteľov budú doplnené pred aktiváciou platieb. Kým platby nie sú aktívne, cenník predstavuje nezáväznú produktovú ponuku.</p>
          ),
        },
        {
          title: 'Dostupnosť a zmeny služby',
          content: (
            <p>Službu môžeme meniť, aktualizovať alebo dočasne obmedziť z bezpečnostných, technických alebo právnych dôvodov. Budeme sa snažiť minimalizovať výpadky, ale nepretržitú a bezchybnú dostupnosť negarantujeme, ak nebolo v osobitnej zmluve dohodnuté SLA.</p>
          ),
        },
        {
          title: 'Obmedzenie zodpovednosti',
          content: (
            <p>V rozsahu dovolenom právnymi predpismi nezodpovedáme za rozhodnutia vykonané výlučne na základe automatizovaného výsledku, za škodu spôsobenú neúplným alebo nesprávne zadaným obsahom ani za služby tretích strán. Toto obmedzenie sa neuplatní tam, kde zodpovednosť nemožno podľa zákona vylúčiť alebo obmedziť.</p>
          ),
        },
        {
          title: 'Pozastavenie a ukončenie',
          content: (
            <p>Prístup môžeme pozastaviť pri porušení podmienok, bezpečnostnom riziku alebo zákonnej požiadavke. Účet môžete zrušiť postupom dostupným v službe alebo kontaktovaním podpory. Dôsledky zrušenia a vymazania údajov sa riadia zásadami ochrany súkromia.</p>
          ),
        },
        {
          title: 'Rozhodné právo a zmeny',
          content: (
            <p>Podmienky sa riadia právom Slovenskej republiky a záväznými pravidlami Európskej únie. Práva spotrebiteľa podľa kogentných predpisov zostávajú zachované. Pri významnej zmene podmienok zverejníme novú verziu a primerane informujeme používateľov.</p>
          ),
        },
      ]}
    />
  )
}
