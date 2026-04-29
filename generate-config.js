const fs = require('fs');
const path = require('path');

/**
 * This script generates the js/config.js file during the build process.
 * The Airtable token stays server-side only; the client uses /api/airtable.
 */

const configContent = `/**
 * Airtable Configuration for Nerah Collections
 * Generated dynamically during build.
 */
const AIRTABLE_CONFIG = {
    // Keep the token server-side only. The client uses /api/airtable.
    API_TOKEN: '',
    BASE_ID: '${process.env.AIRTABLE_BASE_ID || 'appaQdu6OIkysNja7'}',
    TABLE_NAME: '${process.env.AIRTABLE_TABLE_NAME || 'Products'}',
    DEFAULT_PAGE_SIZE: 100,
};

export default AIRTABLE_CONFIG;
`;

const configDir = path.join(__dirname, 'js');
const configPath = path.join(configDir, 'config.js');

if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir);
}

fs.writeFileSync(configPath, configContent);
console.log('js/config.js has been generated successfully.');
console.log(`- Base ID status: ${process.env.AIRTABLE_BASE_ID ? 'Detected' : 'Defaulted'}`);
console.log(`- Table name: ${process.env.AIRTABLE_TABLE_NAME || 'Products'}`);
