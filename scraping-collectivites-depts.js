const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 🔹 URLS DES DÉPARTEMENTS
const URLS = [
  // 56–59
  'https://lannuaire.service-public.gouv.fr/navigation/bretagne/morbihan/mairie',            // 56
  'https://lannuaire.service-public.gouv.fr/navigation/bourgogne-franche-comte/nievre/mairie',// 58
  'https://lannuaire.service-public.gouv.fr/navigation/hauts-de-france/nord/mairie',          // 59

  // 60–64
  'https://lannuaire.service-public.gouv.fr/navigation/hauts-de-france/oise/mairie',          // 60
  'https://lannuaire.service-public.gouv.fr/navigation/normandie/orne/mairie',                 // 61
  'https://lannuaire.service-public.gouv.fr/navigation/hauts-de-france/pas-de-calais/mairie',  // 62
  'https://lannuaire.service-public.gouv.fr/navigation/nouvelle-aquitaine/pyrenees-atlantiques/mairie', // 64

  // 65–69
  'https://lannuaire.service-public.gouv.fr/navigation/occitanie/hautes-pyrenees/mairie',     // 65
  'https://lannuaire.service-public.gouv.fr/navigation/occitanie/pyrenees-orientales/mairie',  // 66
  'https://lannuaire.service-public.gouv.fr/navigation/grand-est/bas-rhin/mairie',             // 67
  'https://lannuaire.service-public.gouv.fr/navigation/grand-est/haut-rhin/mairie',            // 68
  'https://lannuaire.service-public.gouv.fr/navigation/auvergne-rhone-alpes/rhone/mairie',     // 69

  // 70–74
  'https://lannuaire.service-public.gouv.fr/navigation/bourgogne-franche-comte/haute-saone/mairie', // 70
  'https://lannuaire.service-public.gouv.fr/navigation/pays-de-la-loire/sarthe/mairie',        // 72
  'https://lannuaire.service-public.gouv.fr/navigation/auvergne-rhone-alpes/savoie/mairie',    // 73
  'https://lannuaire.service-public.gouv.fr/navigation/auvergne-rhone-alpes/haute-savoie/mairie', // 74

  // 75–79
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/paris/mairie',            // 75
  'https://lannuaire.service-public.gouv.fr/navigation/normandie/seine-maritime/mairie',       // 76
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/seine-et-marne/mairie',   // 77
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/yvelines/mairie',         // 78
  'https://lannuaire.service-public.gouv.fr/navigation/nouvelle-aquitaine/deux-sevres/mairie', // 79

  // 80–84
  'https://lannuaire.service-public.gouv.fr/navigation/hauts-de-france/somme/mairie',          // 80
  'https://lannuaire.service-public.gouv.fr/navigation/occitanie/tarn/mairie',                  // 81
  'https://lannuaire.service-public.gouv.fr/navigation/occitanie/tarn-et-garonne/mairie',      // 82
  'https://lannuaire.service-public.gouv.fr/navigation/provence-alpes-cote-d-azur/var/mairie', // 83
  'https://lannuaire.service-public.gouv.fr/navigation/provence-alpes-cote-d-azur/vaucluse/mairie', // 84

  // 85–89
  'https://lannuaire.service-public.gouv.fr/navigation/pays-de-la-loire/vendee/mairie',        // 85
  'https://lannuaire.service-public.gouv.fr/navigation/nouvelle-aquitaine/vienne/mairie',      // 86
  'https://lannuaire.service-public.gouv.fr/navigation/nouvelle-aquitaine/haute-vienne/mairie',// 87
  'https://lannuaire.service-public.gouv.fr/navigation/grand-est/vosges/mairie',               // 88
  'https://lannuaire.service-public.gouv.fr/navigation/bourgogne-franche-comte/yonne/mairie',  // 89

  // 90–95
  'https://lannuaire.service-public.gouv.fr/navigation/bourgogne-franche-comte/territoire-de-belfort/mairie', // 90
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/essonne/mairie',          // 91
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/hauts-de-seine/mairie',   // 92
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/seine-saint-denis/mairie',// 93
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/val-de-marne/mairie',     // 94
  'https://lannuaire.service-public.gouv.fr/navigation/ile-de-france/val-d-oise/mairie',       // 95
];



// 🔹 MAP SLUG → CODE DÉPARTEMENT
const DEPT_CODES = {
  'morbihan': '56',
  'nievre': '58',
  'nord': '59',
  'oise': '60',
  'orne': '61',
  'pas-de-calais': '62',
  'pyrenees-atlantiques': '64',
  'hautes-pyrenees': '65',
  'pyrenees-orientales': '66',
  'bas-rhin': '67',
  'haut-rhin': '68',
  'rhone': '69',
  'haute-saone': '70',
  'sarthe': '72',
  'savoie': '73',
  'haute-savoie': '74',
  'paris': '75',
  'seine-maritime': '76',
  'seine-et-marne': '77',
  'yvelines': '78',
  'deux-sevres': '79',
  'somme': '80',
  'tarn': '81',
  'tarn-et-garonne': '82',
  'var': '83',
  'vaucluse': '84',
  'vendee': '85',
  'vienne': '86',
  'haute-vienne': '87',
  'vosges': '88',
  'yonne': '89',
  'territoire-de-belfort': '90',
  'essonne': '91',
  'hauts-de-seine': '92',
  'seine-saint-denis': '93',
  'val-de-marne': '94',
  'val-d-oise': '95',
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
