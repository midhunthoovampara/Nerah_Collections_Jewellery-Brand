const fs = require('fs');
const path = require('path');

/**
 * This script generates the js/config.js file during the Netlify build process.
 * It uses Environment Variables set in the Netlify Dashboard.
 */

const configContent = `/**
 * Airtable Configuration for Nerah Collections
 * Generated dynamically during build.
 */
const AIRTABLE_CONFIG = {
    API_TOKEN: '${process.env.AIRTABLE_TOKEN || 'MISSING_TOKEN'}',
    BASE_ID: '${process.env.AIRTABLE_BASE_ID || 'MISSING_BASE_ID'}',
    TABLE_NAME: 'Products',
    DEFAULT_PAGE_SIZE: 100,
};

export default AIRTABLE_CONFIG;
`;

const configDir = path.join(__dirname, 'js');
const configPath = path.join(configDir, 'config.js');

// Ensure the js directory exists
if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
}

// Write the file
fs.writeFileSync(configPath, configContent);
console.log('✅ js/config.js has been generated successfully via Environment Variables.');
