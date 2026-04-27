import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { removeBackground } from '@imgly/background-removal-node';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const destFolder = path.resolve(__dirname, '../public/images/historical/drivers');

// A subset array or full fetch of drivers
async function fetchWikipediaImage(wikiUrl) {
    if (!wikiUrl) return null;
    const title = wikiUrl.split('/').pop();
    
    try {
        const apiUrl = `https://en.wikipedia.org/w/api.php?action=query&prop=pageimages&format=json&piprop=original&titles=${title}`;
        const response = await fetch(apiUrl, {
            headers: {
                'User-Agent': 'F1nsightApp/2.0 (github.com/f1nsight)'
            }
        });
        
        if (!response.ok) {
            console.error(`Wikipedia HTTP Error: ${response.status}`);
            return null;
        }
        
        const data = await response.json();
        
        const pages = data.query.pages;
        const pageId = Object.keys(pages)[0];
        
        if (pageId === '-1' || !pages[pageId].original) {
            return null; // No image found on Wikipedia
        }
        
        return pages[pageId].original.source;
    } catch (e) {
        console.error('Wikipedia API error:', e.message);
        return null;
    }
}

async function run() {
    console.log('Fetching driver list...');
    // We fetch the comprehensive static list
    const res = await fetch('https://praneeth7781.github.io/f1nsight-api-2/driversList.json');
    const drivers = await res.json();
    
    // You can also pass args to run specific ones, e.g., node script.mjs senna garrett
    const targetIds = process.argv.slice(2);
    
    const driversToProcess = targetIds.length > 0 
        ? drivers.filter(d => targetIds.includes(d.driverId))
        : drivers;

    console.log(`Found ${driversToProcess.length} drivers to process.`);

    for (const driver of driversToProcess) {
        const filePath = path.join(destFolder, `${driver.driverId}.png`);
        
        if (existsSync(filePath)) {
            console.log(`Skipping ${driver.driverId}, already exists.`);
            continue;
        }

        console.log(`Looking up ${driver.driverId} (${driver.givenName} ${driver.familyName}) on Wikipedia...`);
        const imageUrl = await fetchWikipediaImage(driver.url);
        
        if (!imageUrl) {
            console.log(`  ❌ No image on English Wikipedia for ${driver.driverId}`);
            continue;
        }

        console.log(`Downloading ${imageUrl}...`);
        try {
            const imgRes = await fetch(imageUrl, {
                headers: {
                    'User-Agent': 'F1nsightApp/2.0 (github.com/f1nsight)'
                }
            });
            
            if (!imgRes.ok) {
                console.error(`  ❌ Failed to download image: ${imgRes.status}`);
                continue;
            }
            
            const contentType = imgRes.headers.get('content-type');
            if (contentType && contentType.includes('text/html')) {
                console.error(`  ❌ Received HTML instead of an image (likely rate-limited)`);
                continue;
            }
            
            const arrayBuffer = await imgRes.arrayBuffer();
            const blob = new Blob([arrayBuffer], { type: imgRes.headers.get('content-type') });
            
            console.log(`  Removing background for ${driver.driverId}...`);
            try {
                const transparentBlob = await removeBackground(blob);
                const transBuffer = await transparentBlob.arrayBuffer();
                await fs.writeFile(filePath, Buffer.from(transBuffer));
                console.log(`  ✅ Successfully saved ${driver.driverId}.png (transparent)!`);
            } catch (bgErr) {
                console.log(`  Background removal failed, saving original image...`);
                await fs.writeFile(filePath, Buffer.from(arrayBuffer));
                console.log(`  ✅ Successfully saved original ${driver.driverId}.png!`);
            }
            
        } catch (err) {
            console.error(`  ❌ Error processing ${driver.driverId}:`, err.message);
        }
        
        // Artificial delay to play nice with Wikipedia limits
        await new Promise(resolve => setTimeout(resolve, 500));
    }
}

run().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
});
