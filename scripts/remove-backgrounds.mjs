import { removeBackground } from '@imgly/background-removal-node';
import fs from 'node:fs/promises';
import path from 'node:path';
import { url } from 'node:inspector';

async function processImage(inputPath, outputPath) {
  console.log(`Processing ${inputPath}...`);
  try {
    // Convert path to file:// URL
    const fileUrl = `file://${inputPath.replace(/\\/g, '/')}`;
    const result = await removeBackground(fileUrl);
    const buffer = Buffer.from(await result.arrayBuffer());
    await fs.writeFile(outputPath, buffer);
    console.log(`Success: ${outputPath}`);
  } catch (error) {
    console.error(`Error processing ${inputPath}:`, error);
  }
}

async function run() {
  const logosDir = 'public/logos';
  const files = ['f1a.png', 'f2.png'];

  for (const file of files) {
    const filePath = path.resolve(logosDir, file);
    await processImage(filePath, filePath);
  }
}

run();
