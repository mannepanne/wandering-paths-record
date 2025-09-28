#!/usr/bin/env node

// Script to automatically update asset references in the Worker file
// This prevents the recurring issue of stale asset references

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CLIENT_DIR = path.join(__dirname, '../dist/client');
const WORKER_FILE = path.join(__dirname, '../dist/wandering_paths_record/worker.js');
const HTML_FILE = path.join(CLIENT_DIR, 'index.html');

console.log('🔧 Updating Worker asset references...');

try {
  // Read the built HTML file to get the actual asset names
  if (!fs.existsSync(HTML_FILE)) {
    console.error('❌ Built index.html not found:', HTML_FILE);
    process.exit(1);
  }

  const html = fs.readFileSync(HTML_FILE, 'utf8');

  // Extract script and CSS asset references
  const scriptMatch = html.match(/<script[^>]*src="([^"]*)"[^>]*>/);
  const cssMatch = html.match(/<link[^>]*href="([^"]*)"[^>]*>/);

  if (!scriptMatch || !cssMatch) {
    console.error('❌ Could not find asset references in HTML');
    process.exit(1);
  }

  const scriptSrc = scriptMatch[1];
  const cssSrc = cssMatch[1];

  console.log('📄 Found assets:');
  console.log('  Script:', scriptSrc);
  console.log('  CSS:', cssSrc);

  // Read the Worker file
  if (!fs.existsSync(WORKER_FILE)) {
    console.error('❌ Worker file not found:', WORKER_FILE);
    process.exit(1);
  }

  let workerContent = fs.readFileSync(WORKER_FILE, 'utf8');

  // Replace the placeholders with actual asset references
  const scriptTag = `<script type="module" crossorigin src="${scriptSrc}"></script>`;
  const cssTag = `<link rel="stylesheet" crossorigin href="${cssSrc}">`;

  workerContent = workerContent.replace('<!-- ASSET_PLACEHOLDER_SCRIPT -->', scriptTag);
  workerContent = workerContent.replace('<!-- ASSET_PLACEHOLDER_CSS -->', cssTag);

  // Write the updated Worker file
  fs.writeFileSync(WORKER_FILE, workerContent);

  console.log('✅ Worker asset references updated successfully');
  console.log('  Script tag:', scriptTag);
  console.log('  CSS tag:', cssTag);

} catch (error) {
  console.error('❌ Error updating Worker assets:', error.message);
  process.exit(1);
}