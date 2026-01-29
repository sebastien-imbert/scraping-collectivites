const { chromium } = require('playwright');
const fs = require('fs');

const MAX_RESULTS = 10;
const START_URL = 'https://lannuaire.service-public.gouv.fr/navigation/epci';
const OUTPUT_FILE = 'intercommunalites-test.json';

(async () => {
  const browser = await chromium.launch({
    headless: false,
    slowMo: 50
  });

  const page = await browser.newPage();
  await page.goto(START_URL, { waitUntil: 'networkidle' });

  let count = 0;
  const results = [];

  while (count < MAX_RESULTS) {
    const links = await page.$$eval(
      '#result-search a.fr-link',
      as => as.map(a => a.href)
    );

    for (const url of links) {
      if (count >= MAX_RESULTS) break;

      console.log(`➡️ (${count + 1}/${MAX_RESULTS}) ${url}`);

      const p = await browser.newPage();
      await p.goto(url, { waitUntil: 'domcontentloaded' });

      const data = await p.evaluate(() => {
        // 1️⃣ Récupération coordonnées depuis OpenStreetMap
        const mapLink = document.querySelector('[data-test="link-voir-sur-une-carte"]')?.href || '';
        let lat = null, lon = null;
        if (mapLink) {
          const mlatMatch = mapLink.match(/mlat=([0-9.+-]+)/);
          const mlonMatch = mapLink.match(/mlon=([0-9.+-]+)/);
          lat = mlatMatch ? parseFloat(mlatMatch[1]) : null;
          lon = mlonMatch ? parseFloat(mlonMatch[1]) : null;
        }

        // 2️⃣ Breadcrumb pour région et département
        const breadcrumbLinks = Array.from(document.querySelectorAll('.fr-breadcrumb__list a.fr-breadcrumb__link'));
        const region = breadcrumbLinks[2]?.innerText || '';
        const departementRaw = breadcrumbLinks[3]?.innerText || '';
        const departementMatch = departementRaw.match(/(.+?)\s*-\s*(\d+)/);
        const departement = departementMatch ? departementMatch[1].trim() : departementRaw;
        const departementCode = departementMatch ? departementMatch[2] : '';

        // 3️⃣ Nettoyage du nom : enlever "Mairie - "
        let nom = document.querySelector('#titlePage')?.innerText || '';
        nom = nom.replace(/^Mairie\s*-\s*/i, '').trim();

        // 4️⃣ Adresse avec CP inclus
        const street = document.querySelector('[itemprop="streetAddress"]')?.innerText?.trim() || '';
        const locality = document.querySelector('[itemprop="addressLocality"]')?.innerText?.trim() || '';
        const postalCode = document.querySelector('[itemprop="postalCode"]')?.innerText?.trim() || '';
        const country = document.querySelector('[itemprop="addressCountry"]')?.innerText?.trim() || '';
        const adresseParts = [street, postalCode, locality, country].filter(Boolean);
        const adresse = adresseParts.join(', ');

        return {
          nom,
          adresse,
          codePostal: postalCode,
          region,
          departement,
          departementCode,
          horaires: Array.from(document.querySelectorAll('[data-test="heure-d-ouverture"]'))
                        .map(e => e.innerText.trim()).join(' | '),
          email: document.querySelector('.send-mail')?.innerText?.trim() || '',
          telephone: document.querySelector('#contentPhone_1')?.innerText?.trim() || '',
          latitude: lat,
          longitude: lon,
          url: location.href,
        };
      });

      results.push(data);
      console.log('✅ OK', data);

      count++;
      await p.close();
      await page.waitForTimeout(500);
    }

    if (count >= MAX_RESULTS) break;

    const nextBtn = await page.$('#btn-next20');
    if (!nextBtn) break;

    await nextBtn.click();
    await page.waitForTimeout(1500);
  }

  // 📝 Écriture JSON
  fs.writeFileSync(
    OUTPUT_FILE,
    JSON.stringify(results, null, 2),
    'utf-8'
  );

  console.log(`🎉 TERMINÉ : ${results.length} collectivités`);
  console.log(`📁 Fichier créé : ${OUTPUT_FILE}`);

  await browser.close();
})();
