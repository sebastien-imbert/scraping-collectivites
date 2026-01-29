const { chromium } = require('playwright');
const fs = require('fs');

const START_URL = 'https://lannuaire.service-public.gouv.fr/navigation/mairie';

const START_INDEX = 3000;
const END_INDEX = 3500;
const SAVE_EVERY = 50;

const OUTPUT_FILE = `collectivites_${START_INDEX}-${END_INDEX}.json`;

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const page = await browser.newPage();
  await page.goto(START_URL, { waitUntil: 'networkidle' });

  let count = 0;
  const results = [];
  const visitedUrls = new Set();

  // 🔹 Avancer jusqu'à START_INDEX
  if (START_INDEX > 0) {
    const clicksNeeded = Math.floor(START_INDEX / 20);
    console.log(`🔹 Avancer à l'index ${START_INDEX} : ${clicksNeeded} clics`);

    for (let i = 0; i < clicksNeeded; i++) {
      const nextBtn = await page.$('#btn-next20');
      if (!nextBtn) break;

      await nextBtn.click();
      await page.waitForTimeout(300);
    }
  }

  // 🛑 Pause inspection DOM
  console.log('🛑 Pause après pagination');
  await page.pause();

  // 🔁 Scraping séquentiel
  while (count < END_INDEX - START_INDEX) {
    const links = await page.$$eval(
      '#result-search a.fr-link',
      as => as.map(a => a.href)
    );

    const newLinks = links.filter(url => !visitedUrls.has(url));

    if (newLinks.length === 0) {
      console.log('ℹ️ Aucun nouveau lien visible, pagination suivante');
    }

    for (const url of newLinks) {
      if (count >= END_INDEX - START_INDEX) break;

      visitedUrls.add(url);
      console.log(`➡️ (${START_INDEX + count + 1}/${END_INDEX}) ${url}`);

      const p = await browser.newPage();
      await p.goto(url, { waitUntil: 'domcontentloaded' });

      const data = await p.evaluate(() => {
        const mapLink = document.querySelector('[data-test="link-voir-sur-une-carte"]')?.href || '';
        let lat = null, lon = null;

        if (mapLink) {
          lat = mapLink.match(/mlat=([0-9.+-]+)/)?.[1] ?? null;
          lon = mapLink.match(/mlon=([0-9.+-]+)/)?.[1] ?? null;
        }

        const breadcrumbLinks = Array.from(
          document.querySelectorAll('.fr-breadcrumb__list a.fr-breadcrumb__link')
        );

        const region = breadcrumbLinks[2]?.innerText || '';
        const depRaw = breadcrumbLinks[3]?.innerText || '';
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
          horaires: Array.from(
            document.querySelectorAll('[data-test="heure-d-ouverture"]')
          ).map(e => e.innerText.trim()).join(' | '),
          email: document.querySelector('.send-mail')?.innerText || '',
          telephone: document.querySelector('#contentPhone_1')?.innerText || '',
          latitude: lat ? parseFloat(lat) : null,
          longitude: lon ? parseFloat(lon) : null,
          website:
            document.querySelector('li[data-test="websites"] a[itemprop="url"]')?.href || '',
          url: location.href
        };
      });

      results.push(data);
      count++;

      if (count % SAVE_EVERY === 0) {
        fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
        console.log(`💾 Sauvegarde (${START_INDEX + count})`);
      }

      await p.close();
      await page.waitForTimeout(300);
    }

    // Pagination suivante
    const nextBtn = await page.$('#btn-next20');
    if (!nextBtn) {
      console.log('🏁 Fin pagination');
      break;
    }

    await nextBtn.click();
    await page.waitForTimeout(500);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(results, null, 2));
  console.log(`🎉 TERMINÉ : ${results.length} collectivités`);
  await browser.close();
})();
