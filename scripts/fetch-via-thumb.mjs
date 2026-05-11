/**
 * Downloads missing historical driver images using Wikipedia's thumbnail API.
 * This uses the pithumbsize parameter which serves images through the API,
 * avoiding the rate-limiting issues with direct upload.wikimedia.org access.
 * 
 * Usage: node scripts/fetch-via-thumb.mjs [driverId1] [driverId2] ...
 *        node scripts/fetch-via-thumb.mjs                  # all missing
 */
import fs from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const destFolder = path.resolve(__dirname, '../public/images/historical/drivers');
const targetIds = process.argv.slice(2).filter(a => !a.startsWith('--'));

const THUMB_SIZE = 800; // px - good quality for driver portraits

async function getThumbUrl(wikiUrl) {
    if (!wikiUrl) return null;
    const title = wikiUrl.split('/').pop();
    
    // Use pithumbsize to get a thumbnail served through the API itself
    const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&pithumbsize=${THUMB_SIZE}&titles=${title}`;
    
    try {
        const response = await fetch(apiUrl, {
            headers: { 'User-Agent': 'F1TelemetryApp/2.0 (https://github.com/f1-telemetry; contact@f1telemetry.com)' }
        });
        
        if (!response.ok) return null;
        
        const data = await response.json();
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        
        if (pageId === '-1' || !pages[pageId].thumbnail) return null;
        
        const src = pages[pageId].thumbnail.source;
        // Skip SVGs
        if (src.match(/\.svg/i)) return null;
        
        return src;
    } catch (e) {
        console.error(`  API error: ${e.message}`);
        return null;
    }
}

async function downloadImage(url) {
    for (let attempt = 1; attempt <= 3; attempt++) {
        try {
            const response = await fetch(url, {
                headers: {
                    'User-Agent': 'F1TelemetryApp/2.0 (https://github.com/f1-telemetry; contact@f1telemetry.com)',
                }
            });
            
            if (response.status === 429 || response.status === 403) {
                const wait = attempt * 10000;
                console.log(`    ${response.status} - waiting ${wait/1000}s (attempt ${attempt}/3)...`);
                await new Promise(r => setTimeout(r, wait));
                continue;
            }
            
            if (!response.ok) {
                console.error(`    HTTP ${response.status}`);
                return null;
            }
            
            return Buffer.from(await response.arrayBuffer());
        } catch (err) {
            console.error(`    Download error: ${err.message}`);
            if (attempt < 3) await new Promise(r => setTimeout(r, 5000));
        }
    }
    return null;
}

async function run() {
    await fs.mkdir(destFolder, { recursive: true });
    
    console.log('Fetching driver list...');
    const res = await fetch('https://matthewdelong.github.io/f1-telemetry-api/driversList.json');
    const allDrivers = await res.json();
    
    let driversToProcess;
    if (targetIds.length > 0) {
        driversToProcess = allDrivers.filter(d => targetIds.includes(d.driverId));
        const found = driversToProcess.map(d => d.driverId);
        const notFound = targetIds.filter(id => !found.includes(id));
        if (notFound.length > 0) console.log(`⚠️ Not in driver list: ${notFound.join(', ')}`);
    } else {
        // All missing drivers (no file or file < 3KB indicates a broken/placeholder image)
        driversToProcess = allDrivers.filter(d => {
            const fp = path.join(destFolder, `${d.driverId}.png`);
            if (!existsSync(fp)) return true;
            try { return statSync(fp).size < 3000; } catch { return true; }
        });
    }
    
    console.log(`Processing ${driversToProcess.length} drivers...\n`);
    
    let success = 0, failed = 0, noImage = 0;
    
    for (let i = 0; i < driversToProcess.length; i++) {
        const driver = driversToProcess[i];
        const filePath = path.join(destFolder, `${driver.driverId}.png`);
        
        process.stdout.write(`[${i+1}/${driversToProcess.length}] ${driver.driverId} `);
        
        const thumbUrl = await getThumbUrl(driver.url);
        if (!thumbUrl) {
            console.log('— no image');
            noImage++;
            await new Promise(r => setTimeout(r, 500));
            continue;
        }
        
        const buffer = await downloadImage(thumbUrl);
        if (buffer && buffer.length > 1000) {
            await fs.writeFile(filePath, buffer);
            console.log(`✅ ${(buffer.length / 1024).toFixed(0)}KB`);
            success++;
        } else {
            console.log('❌ failed');
            failed++;
        }
        
        // Respectful delay between requests
        await new Promise(r => setTimeout(r, 2000));
    }
    
    console.log(`\n✅ ${success} downloaded | ❌ ${failed} failed | ⚪ ${noImage} no image`);
}

run().catch(err => { console.error('Fatal:', err); process.exit(1); });
