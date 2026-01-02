const fs = require('fs');
const path = require('path');
const https = require('https');

const SITE_URL = 'https://www.floreriawildgarden.cl';
const PRODUCTS_API_URL = 'https://wildgarden.onrender.com/api/products';

function getJson(url) {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        const { statusCode } = res;
        let raw = '';
        res.setEncoding('utf8');
        res.on('data', (chunk) => (raw += chunk));
        res.on('end', () => {
          try {
            if (!statusCode || statusCode < 200 || statusCode >= 300) {
              return reject(new Error(`HTTP ${statusCode} al pedir ${url}`));
            }
            resolve(JSON.parse(raw));
          } catch (e) {
            reject(e);
          }
        });
      })
      .on('error', reject);
  });
}

function xmlEscape(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function toIsoDateFromFirestoreTimestamp(ts) {
  const seconds = Number(ts?._seconds ?? ts?.seconds ?? ts) || 0;
  if (!seconds) return null;
  return new Date(seconds * 1000).toISOString();
}

function buildUrlEntry({ loc, lastmod }) {
  const lastmodTag = lastmod ? `\n    <lastmod>${xmlEscape(lastmod)}</lastmod>` : '';
  return `  <url>\n    <loc>${xmlEscape(loc)}</loc>${lastmodTag}\n  </url>`;
}

async function main() {
  const products = await getJson(PRODUCTS_API_URL);
  if (!Array.isArray(products)) {
    throw new Error('La API de productos no devolvió un array.');
  }

  const urls = [];

  // Páginas base
  urls.push({ loc: `${SITE_URL}/` });
  urls.push({ loc: `${SITE_URL}/pages/productos.html` });

  // Productos (solo activos)
  for (const p of products) {
    if (p && p.isActive === false) continue;
    const productId = p?.product_id;
    if (!productId) continue;

    const loc = `${SITE_URL}/pages/producto.html?id=${encodeURIComponent(String(productId))}`;
    const lastmod = toIsoDateFromFirestoreTimestamp(p?.updatedAt) || toIsoDateFromFirestoreTimestamp(p?.createdAt);
    urls.push({ loc, lastmod });
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(buildUrlEntry).join('\n') +
    `\n</urlset>\n`;

  const outPath = path.join(__dirname, '..', 'sitemap.xml');
  fs.writeFileSync(outPath, xml, 'utf8');

  console.log(`OK: sitemap generado en ${outPath}`);
  console.log(`URLs: ${urls.length}`);
}

main().catch((err) => {
  console.error('Error generando sitemap:', err);
  process.exitCode = 1;
});
