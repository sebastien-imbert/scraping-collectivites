const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

// 🔹 URL DU DÉPARTEMENT
const START_URL =
  'https://lannuaire.service-public.gouv.fr/navigation/occitanie/haute-garonne/mairie';

const OUTPUT_DIR = path.join(__dirname, 'data'); // ./data
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR); // crée le dossier s'il n'existe pas
}

const OUTPUT_FILE = path.join(OUTPUT_DIR, `31_mairies_haute_garonne.jsonl`);

(async () => {
  const browser = await chromium.launch({ headless: true, slowMo: 50 });
  const page = await browser.newPage();
  await page.goto(START_URL, { waitUntil: 'networkidle' });

  let count = 0;
  const visitedUrls = new Set();

  while (true) {
    // 🔹 Récupérer tous les liens visibles
    const links = await page.$$eval(
      '#results-list a[data-test="href-link-annuaire"]',
      els => els.map(a => a.href)
    );

    const newLinks = links.filter(url => !visitedUrls.has(url));

    if (newLinks.length === 0) {
      console.log('🏁 Plus de nouveaux liens, fin de la pagination');
      break;
    }

    for (const url of newLinks) {
      visitedUrls.add(url);
      console.log(`➡️ (${count + 1}) ${url}`);

      const p = await browser.newPage();
      try {
        await p.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });

        const data = await p.evaluate(() => {
          const mapLink = document.querySelector('[data-test="link-voir-sur-une-carte"]')?.href || '';
          let lat = null, lon = null;
          if (mapLink) {
            lat = mapLink.match(/mlat=([0-9.+-]+)/)?.[1] ?? null;
            lon = mapLink.match(/mlon=([0-9.+-]+)/)?.[1] ?? null;
          }

          const breadcrumb = Array.from(document.querySelectorAll('.fr-breadcrumb__list a.fr-breadcrumb__link'));
          const region = breadcrumb[2]?.innerText || '';
          const depRaw = breadcrumb[3]?.innerText || '';
          const depMatch = depRaw.match(/(.+?)\s*-\s*(\d+)/);

          let nom = document.querySelector('#titlePage')?.innerText || '';
          nom = nom.replace(/^Mairie\s*-\s*/i, '').trim();

          const street = document.querySelector('[itemprop="streetAddress"]')?.innerText || '';
          const locality = document.querySelector('[itemprop="addressLocality"]')?.innerText || '';
          const postalCode = document.querySelector('[itemprop="postalCode"]')?.innerText || '';
          const country = document.querySelector('[itemprop="addressCountry"]')?.innerText || '';

          return {
            nom,
            adresse: [street, postalCode, locality, country].filter(Boolean).join(', '),
            codePostal: postalCode,
            region,
            departement: depMatch?.[1] || depRaw,
            departementCode: depMatch?.[2] || '',
            horaires: Array.from(document.querySelectorAll('[data-test="heure-d-ouverture"]')).map(e => e.innerText.trim()).join(' | '),
            email: document.querySelector('.send-mail')?.innerText?.trim() || '',
            telephone: document.querySelector('#contentPhone_1')?.innerText?.trim() || '',
            latitude: lat ? parseFloat(lat) : null,
            longitude: lon ? parseFloat(lon) : null,
            website: document.querySelector('li[data-test="websites"] a[itemprop="url"]')?.href || '',
            url: location.href
          };
        });

        // 🔹 Écrire chaque mairie dans le fichier immédiatement
        fs.appendFileSync(OUTPUT_FILE, JSON.stringify(data) + '\n');

        count++;
      } catch (err) {
        console.log(`⚠️ Erreur sur ${url}:`, err.message);
      } finally {
        await p.close();
      }

      await page.waitForTimeout(200);
    }

    // 🔹 Pagination suivante
    const nextBtn = await page.$('#btn-add-next20');
    if (!nextBtn) {
      console.log('🏁 Pas de bouton suivant, fin de la pagination');
      break;
    }

    const prevCount = visitedUrls.size;
    await nextBtn.click();

    try {
      await page.waitForFunction(
        prev => document.querySelectorAll('#results-list a[data-test="href-link-annuaire"]').length > prev,
        prevCount,
        { timeout: 10000 }
      );
    } catch {
      console.log('⚠️ Timeout: plus de nouveaux liens après pagination');
      break;
    }

    await page.waitForTimeout(500);
  }

  console.log(`🎉 TERMINÉ : ${count} mairies`);
  await browser.close();
})();
