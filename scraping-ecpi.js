const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 🔹 URLS DES RÉGIONS (EPCI)
const URLS = [
  'https://lannuaire.service-public.gouv.fr/navigation/auvergne-rhone-alpes/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/bourgogne-franche-comte/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/bretagne/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/centre-val-de-loire/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/corse/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/grand-est/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/hauts-de-france/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/normandie/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/nouvelle-aquitaine/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/occitanie/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/pays-de-la-loire/epci',
  'https://lannuaire.service-public.gouv.fr/navigation/provence-alpes-cote-d-azur/epci',
];

// 🔹 CODE INSEE RÉGIONS
const REGION_CODES = {
  'auvergne-rhone-alpes': '84',
  'bourgogne-franche-comte': '27',
  'bretagne': '53',
  'centre-val-de-loire': '24',
  'corse': '94',
  'grand-est': '44',
  'hauts-de-france': '32',
  'ile-de-france': '11',
  'normandie': '28',
  'nouvelle-aquitaine': '75',
  'occitanie': '76',
  'pays-de-la-loire': '52',
  'provence-alpes-cote-d-azur': '93',
};

// 🔹 OUTPUT
const OUTPUT_DIR = path.join(__dirname, 'data', 'ecpi');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

function getOutputFileFromUrl(url) {
  const parts = url.split('/');
  const regionSlug = parts[parts.length - 2];
  const code = REGION_CODES[regionSlug] || 'XX';
  return `${code}_epci_${regionSlug.replace(/-/g, '_')}.jsonl`;
}

(async () => {
  const browser = await chromium.launch({ headless: true });

  for (const START_URL of URLS) {
    const OUTPUT_FILE = path.join(OUTPUT_DIR, getOutputFileFromUrl(START_URL));
    console.log(`\n📁 Région → ${OUTPUT_FILE}`);

    const page = await browser.newPage();
    await page.goto(START_URL, { waitUntil: 'networkidle' });

    const visited = new Set();
    let count = 0;

    while (true) {
      const links = await page.$$eval(
        '#results-list a[data-test="href-link-annuaire"]',
        els => els.map(a => a.href)
      );

      const newLinks = links.filter(l => !visited.has(l));
      if (!newLinks.length) break;

      for (const url of newLinks) {
        visited.add(url);
        const p = await browser.newPage();

        try {
          await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

          const data = await p.evaluate(() => {
            // Nom
            const title = document.querySelector('#titlePage')?.innerText || '';
            const nom = title.replace(/^EPCI\s*-\s*/i, '').trim();

            // Type
            const type = document.querySelector('[data-test="epci-type"]')?.innerText || '';

            // Adresse
            const street = document.querySelector('[itemprop="streetAddress"]')?.innerText || '';
            const postalCode = document.querySelector('[itemprop="postalCode"]')?.innerText?.trim() || '';
            const city = document.querySelector('[itemprop="addressLocality"]')?.innerText || '';
            const country = document.querySelector('[itemprop="addressCountry"]')?.innerText || 'France';
            const adresse = `${street}, ${postalCode}, ${city}, ${country}`;

            // Horaires
            const horaires = Array.from(document.querySelectorAll('ul[data-test="heure-d-ouverture"] li'))
              .map(li => li.innerText.trim().replace(/\s+/g, ' '))
              .join(' | ');

            // Contact
            const email = document.querySelector('.send-mail')?.innerText?.trim() || '';
            const telephone = document.querySelector('#contentPhone_1')?.innerText?.trim() || '';
            const website = document.querySelector('li[data-test="websites"] a')?.href || '';

            // Lat / Lng
            const mapLink = document.querySelector('a[data-test="link-voir-sur-une-carte"]')?.href || '';
            let latitude = null;
            let longitude = null;
            if (mapLink) {
              const latMatch = mapLink.match(/mlat=([0-9.+-]+)/);
              const lonMatch = mapLink.match(/mlon=([0-9.+-]+)/);
              if (latMatch) latitude = parseFloat(latMatch[1]);
              if (lonMatch) longitude = parseFloat(lonMatch[1]);
            }

            return {
              nom,
              type,
              adresse,
              postalCode,
              city,
              country,
              horaires,
              contacts: { email, telephone },
              website,
              latitude,
              longitude,
              url: location.href,
            };
          });

          fs.appendFileSync(OUTPUT_FILE, JSON.stringify(data) + '\n');
          count++;
        } catch (e) {
          console.log(`⚠️ ${e.message}`);
        } finally {
          await p.close();
        }
      }

      // Pagination
      const nextBtn = await page.$('#btn-add-next20');
      if (!nextBtn || !(await nextBtn.isVisible())) break;

      await nextBtn.click();
      await page.waitForTimeout(500);
    }

    console.log(`✅ ${count} EPCI enregistrés`);
    await page.close();
  }

  console.log('\n🎉 SCRAP EPCI TERMINÉ');
  await browser.close();
})();
