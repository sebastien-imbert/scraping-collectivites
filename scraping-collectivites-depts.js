const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 🔹 URLS DES DÉPARTEMENTS
const URLS = [
  'https://lannuaire.service-public.gouv.fr/navigation/centre-val-de-loire/loiret/mairie',         // 45 Loiret
  'https://lannuaire.service-public.gouv.fr/navigation/occitanie/lot/mairie',                       // 46 Lot
  'https://lannuaire.service-public.gouv.fr/navigation/nouvelle-aquitaine/lot-et-garonne/mairie',   // 47 Lot-et-Garonne
  'https://lannuaire.service-public.gouv.fr/navigation/occitanie/lozere/mairie',                    // 48 Lozère
  'https://lannuaire.service-public.gouv.fr/navigation/pays-de-la-loire/maine-et-loire/mairie',     // 49 Maine-et-Loire
  'https://lannuaire.service-public.gouv.fr/navigation/normandie/manche/mairie',                      // 50 Manche
  'https://lannuaire.service-public.gouv.fr/navigation/grand-est/marne/mairie',                      // 51 Marne
  'https://lannuaire.service-public.gouv.fr/navigation/grand-est/haute-marne/mairie',               // 52 Haute-Marne
  'https://lannuaire.service-public.gouv.fr/navigation/pays-de-la-loire/mayenne/mairie',            // 53 Mayenne
  'https://lannuaire.service-public.gouv.fr/navigation/grand-est/meurthe-et-moselle/mairie',        // 54 Meurthe-et-Moselle
  'https://lannuaire.service-public.gouv.fr/navigation/grand-est/meuse/mairie',                      // 55 Meuse
];


// 🔹 MAP SLUG → CODE DÉPARTEMENT
const DEPT_CODES = {
  'loiret': '45',
  'lot': '46',
  'lot-et-garonne': '47',
  'lozere': '48',
  'maine-et-loire': '49',
  'manche': '50',
  'marne': '51',
  'haute-marne': '52',
  'mayenne': '53',
  'meurthe-et-moselle': '54',
  'meuse': '55',
};

// 🔹 DOSSIER OUTPUT
const OUTPUT_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// 🔹 Génère le nom de fichier depuis l’URL
function getOutputFileFromUrl(url) {
  const parts = url.split('/');
  const deptSlug = parts[parts.length - 2]; // haute-garonne
  const code = DEPT_CODES[deptSlug] || 'XX';
  const safeName = deptSlug.replace(/-/g, '_');
  return `${code}_mairies_${safeName}.jsonl`;
}

(async () => {
  const browser = await chromium.launch({ headless: true, slowMo: 20 });

  for (const START_URL of URLS) {
    const fileName = getOutputFileFromUrl(START_URL);
    const OUTPUT_FILE = path.join(OUTPUT_DIR, fileName);

    console.log(`\n📁 Département → ${fileName}`);

    const page = await browser.newPage();
    await page.goto(START_URL, { waitUntil: 'networkidle' });

    let count = 0;
    const visitedUrls = new Set();

    while (true) {
      // 🔹 Liens mairies
      const links = await page.$$eval(
        '#results-list a[data-test="href-link-annuaire"]',
        els => els.map(a => a.href)
      );

      const newLinks = links.filter(l => !visitedUrls.has(l));
      if (!newLinks.length) {
        console.log('🏁 Plus de nouveaux liens');
        break;
      }

      for (const url of newLinks) {
        visitedUrls.add(url);
        console.log(`➡️ ${url}`);

        const p = await browser.newPage();

        try {
          await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

          const data = await p.evaluate(() => {
            const mapLink =
              document.querySelector('[data-test="link-voir-sur-une-carte"]')
                ?.href || '';

            let lat = null;
            let lon = null;

            if (mapLink) {
              lat = mapLink.match(/mlat=([0-9.+-]+)/)?.[1] ?? null;
              lon = mapLink.match(/mlon=([0-9.+-]+)/)?.[1] ?? null;
            }

            const breadcrumb = Array.from(
              document.querySelectorAll('.fr-breadcrumb__list a.fr-breadcrumb__link')
            );

            const region = breadcrumb[2]?.innerText || '';
            const depRaw = breadcrumb[3]?.innerText || '';
            const depMatch = depRaw.match(/(.+?)\s*-\s*(\d+)/);

            let nom = document.querySelector('#titlePage')?.innerText || '';
            nom = nom.replace(/^Mairie\s*-\s*/i, '').trim();

            const street =
              document.querySelector('[itemprop="streetAddress"]')?.innerText || '';
            const locality =
              document.querySelector('[itemprop="addressLocality"]')?.innerText || '';
            const postalCode =
              document.querySelector('[itemprop="postalCode"]')?.innerText || '';
            const country =
              document.querySelector('[itemprop="addressCountry"]')?.innerText || '';

            return {
              nom,
              adresse: [street, postalCode, locality, country]
                .filter(Boolean)
                .join(', '),
              codePostal: postalCode.trim(),
              region,
              departement: depMatch?.[1] || depRaw,
              departementCode: depMatch?.[2] || '',
              horaires: Array.from(
                document.querySelectorAll('[data-test="heure-d-ouverture"]')
              )
                .map(e => e.innerText.trim())
                .join(' | '),
              email:
                document.querySelector('.send-mail')?.innerText?.trim() || '',
              telephone:
                document.querySelector('#contentPhone_1')?.innerText?.trim() || '',
              latitude: lat ? parseFloat(lat) : null,
              longitude: lon ? parseFloat(lon) : null,
              website:
                document.querySelector(
                  'li[data-test="websites"] a[itemprop="url"]'
                )?.href || '',
              url: location.href,
            };
          });

          fs.appendFileSync(OUTPUT_FILE, JSON.stringify(data) + '\n');
          count++;
        } catch (err) {
          console.log(`⚠️ Erreur sur ${url}: ${err.message}`);
        } finally {
          await p.close();
        }

        await page.waitForTimeout(200);
      }

// 🔹 Pagination suivante
try {
  const nextBtn = await page.$('#btn-add-next20');

  if (!nextBtn) {
    console.log('🏁 Pas de bouton suivant');
    break;
  }

  const isVisible = await nextBtn.isVisible();
  if (!isVisible) {
    console.log('🏁 Bouton suivant invisible = fin du département');
    break;
  }

  const prevCount = visitedUrls.size;

  await nextBtn.click({ timeout: 5000 });

  await page.waitForFunction(
    prev => document.querySelectorAll('#results-list a[data-test="href-link-annuaire"]').length > prev,
    prevCount,
    { timeout: 8000 }
  );

  await page.waitForTimeout(500);

} catch (err) {
  console.log('⚠️ Fin de pagination ou bouton non cliquable');
  break; // 🔹 TRÈS IMPORTANT
}

    }

    console.log(`✅ ${count} mairies enregistrées`);
    await page.close();
  }

  console.log('\n🎉 TERMINÉ POUR TOUS LES DÉPARTEMENTS');
  await browser.close();
})();
