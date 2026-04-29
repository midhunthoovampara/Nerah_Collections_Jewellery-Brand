/**
 * Airtable Configuration for Nerah Collections
 * 
 * Replace placeholders with your actual credentials.
 * Get your token at: https://airtable.com/create/tokens
 */
const AIRTABLE_CONFIG = {
    // Token is intentionally left empty in the repo.
    // Netlify Function reads AIRTABLE_TOKEN from environment variables.
    API_TOKEN: '',
    BASE_ID: 'appaQdu6OIkysNja7',
    TABLE_NAME: 'Products', // Ensure this matches your table name exactly
    DEFAULT_PAGE_SIZE: 100,
};

export default AIRTABLE_CONFIG;
