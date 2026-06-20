const fs = require('fs');
const path = require('path');

console.log('═══════════════════════════════════════');
console.log('   Shénqí Nǚxiá Bot - Validation Test');
console.log('═══════════════════════════════════════\n');

const requiredFiles = [
  'index.js',
  'case.js',
  'whatsapp.js',
  'settings.js',
  'package.json',
  'helper/function.js',
  'helper/generate.js',
  'database/premium.json',
  'database/paired.json',
  'database/paid.json',
  'database/settings.json'
];

let allPassed = true;

console.log('📋 Checking Required Files...\n');

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  if (!exists) allPassed = false;
});

console.log('\n📦 Checking Dependencies...\n');

try {
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = pkg.dependencies || {};
  
  const requiredDeps = [
    '@whiskeysockets/baileys',
    'node-telegram-bot-api',
    'pino',
    'node-cache',
    'axios',
    'chalk',
    'moment-timezone'
  ];
  
  requiredDeps.forEach(dep => {
    const exists = deps.hasOwnProperty(dep.split('/').pop()) || deps.hasOwnProperty(dep);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${dep}`);
    if (!exists) allPassed = false;
  });
} catch (error) {
  console.log('❌ Failed to read package.json');
  allPassed = false;
}

console.log('\n⚙️ Checking Configuration...\n');

try {
  const config = require('./settings');
  
  const configChecks = [
    { key: 'botName', value: config.botName },
    { key: 'owner', value: config.owner },
    { key: 'telegramToken', value: config.telegramToken },
    { key: 'telegramOwner', value: config.telegramOwner },
    { key: 'whatsappOwner', value: config.whatsappOwner }
  ];
  
  configChecks.forEach(check => {
    const exists = check.value !== undefined;
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${check.key}: ${exists ? '✓' : 'Missing'}`);
    if (!exists) allPassed = false;
  });
} catch (error) {
  console.log('❌ Failed to load settings.js');
  console.log(error.message);
  allPassed = false;
}

console.log('\n📁 Checking Directory Structure...\n');

const requiredDirs = [
  'database',
  'database/sessions',
  'helper',
  'media'
];

requiredDirs.forEach(dir => {
  const exists = fs.existsSync(dir);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${dir}/`);
  if (!exists) {
    allPassed = false;
  }
});

console.log('\n═══════════════════════════════════════');
if (allPassed) {
  console.log('✅ All Validation Checks Passed!');
  console.log('═══════════════════════════════════════');
  console.log('\n🚀 Bot is ready to start!');
  console.log('Run: npm start or node index.js\n');
} else {
  console.log('❌ Some Validation Checks Failed!');
  console.log('═══════════════════════════════════════');
  console.log('\n⚠️ Please fix the issues above before starting.\n');
}
