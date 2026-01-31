#!/usr/bin/env node
/**
 * Patch @aioha/react-ui to disable account discovery for MetaMask
 * This makes MetaMask show username input instead of trying to auto-discover accounts
 */
const fs = require('fs');
const path = require('path');

// Patch the compiled JS file (this is what's actually used at runtime)
const filePath = path.join(__dirname, '../node_modules/@aioha/react-ui/dist/components/ProviderInfo.js');

try {
  let content = fs.readFileSync(filePath, 'utf8');

  // Only patch if not already patched
  if (content.includes('[Providers.MetaMaskSnap]: {') && content.includes('discovery: true')) {
    content = content.replace(
      /(\[Providers\.MetaMaskSnap\]: \{[^}]*discovery:\s*)true/,
      '$1false'
    );
    fs.writeFileSync(filePath, content);
    console.log('✓ Patched @aioha/react-ui: MetaMask now shows username input');
  } else if (content.includes('discovery: false')) {
    console.log('✓ @aioha/react-ui already patched');
  } else {
    console.log('⚠ Could not find MetaMask discovery setting to patch');
  }
} catch (err) {
  console.error('⚠ Failed to patch @aioha/react-ui:', err.message);
}
