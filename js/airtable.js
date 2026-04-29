import AIRTABLE_CONFIG from './config.js';

const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';
const AIRTABLE_PROXY_ENDPOINT = '/api/airtable';

function escapeFormulaValue(value) {
    return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function isAirtableRecordId(identifier) {
    return /^rec[a-zA-Z0-9]+$/.test(String(identifier));
}

function appendQueryParams(search, query = {}) {
    for (const [key, value] of Object.entries(query)) {
        if (value === undefined || value === null || value === '') continue;

        if (key === 'sort' && Array.isArray(value)) {
            value.forEach((entry, index) => {
                if (!entry) return;
                search.append(`sort[${index}][field]`, entry.field);
                search.append(`sort[${index}][direction]`, entry.direction || 'asc');
            });
            continue;
        }

        search.append(key, String(value));
    }
}

function buildAirtablePath(path = '') {
    const { BASE_ID, TABLE_NAME } = AIRTABLE_CONFIG;
    return `${AIRTABLE_API_BASE}/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}${path}`;
}

function buildProxyUrl(path = '', query = {}) {
    if (typeof window === 'undefined' || !window.location?.origin) return null;

    const url = new URL(AIRTABLE_PROXY_ENDPOINT, window.location.origin);
    url.searchParams.set('path', `/${AIRTABLE_CONFIG.BASE_ID}/${encodeURIComponent(AIRTABLE_CONFIG.TABLE_NAME)}${path}`);
    appendQueryParams(url.searchParams, query);
    return url.toString();
}

function isLocalDevelopment() {
    if (typeof window === 'undefined' || !window.location) return false;
    return ['localhost', '127.0.0.1', '::1'].includes(window.location.hostname) || window.location.hostname.endsWith('.local');
}

function canUseDirectAirtable() {
    return Boolean(AIRTABLE_CONFIG.API_TOKEN && AIRTABLE_CONFIG.API_TOKEN !== 'MISSING_TOKEN');
}

/**
 * Airtable API utility for Nerah Collections.
 * Keeps the pages focused on rendering while this file handles data fetching,
 * mapping, and record lookups.
 */
const AirtableService = {
    async request(path = '', query = {}) {
        const search = new URLSearchParams();
        appendQueryParams(search, query);
        const queryString = search.toString();
        const pathUrl = buildAirtablePath(path);

        const proxyUrl = buildProxyUrl(path, query);
        if (proxyUrl) {
            try {
                const proxyResponse = await fetch(proxyUrl, { cache: 'no-store' });
                if (proxyResponse.ok) {
                    return proxyResponse.json();
                }
                const proxyText = await proxyResponse.text();
                const proxyMessage = proxyText || `Airtable proxy returned ${proxyResponse.status}`;
                console.warn(proxyMessage);
                if (!isLocalDevelopment() || !canUseDirectAirtable()) {
                    throw new Error(proxyMessage);
                }
            } catch (error) {
                if (!isLocalDevelopment() || !canUseDirectAirtable()) {
                    throw error;
                }
                console.warn('Airtable proxy request failed, falling back to direct Airtable fetch:', error);
            }
        }

        const { API_TOKEN } = AIRTABLE_CONFIG;
        const url = `${pathUrl}${queryString ? `?${queryString}` : ''}`;

        const response = await fetch(url, {
            headers: {
                Authorization: `Bearer ${API_TOKEN}`,
            },
        });

        if (!response.ok) {
            let message = 'Failed to fetch from Airtable';
            try {
                const error = await response.json();
                message = error?.error?.message || message;
            } catch (_) {
                // Ignore JSON parsing issues and fall back to the default message.
            }
            throw new Error(message);
        }

        return response.json();
    },

    async fetchRecords(query = {}) {
        try {
            const data = await this.request('', query);
            return (data.records || []).map(record => this.mapRecord(record));
        } catch (error) {
            console.error('Airtable fetch error:', error);
            return null;
        }
    },

    async fetchRecordById(recordId) {
        try {
            const data = await this.request(`/${recordId}`);
            return this.mapRecord(data);
        } catch (error) {
            console.error('Airtable record lookup error:', error);
            return null;
        }
    },

    mapRecord(record) {
        const fields = record?.fields || {};
        const price = fields['Price'];
        const images = Array.isArray(fields['Product Images']) ? fields['Product Images'] : [];
        const mainImage = images[0]?.url || fields['Main Image'] || fields['Image'] || '';

        return {
            id: record.id,
            productId: fields['Product ID'] || '',
            name: fields['Product Name'] || 'Untitled Product',
            price: typeof price === 'number'
                ? `₹${price.toLocaleString('en-IN')}`
                : (price || 'Enquire'),
            category: fields['Category'] || '',
            images: images.map(img => img.url).filter(Boolean),
            mainImage,
            description: fields['Description'] || '',
            material: fields['Material'] || '',
            size: fields['Size'] || '',
            weight: fields['Weight'] || '',
            colors: fields['Colors'] || fields['Colour'] || fields['Color'] || '',
            stockStatus: fields['Stock Status'] || 'In Stock',
            stockQuantity: fields['Stock Quantity'] || '',
            featured: Boolean(fields['Featured']),
            careInstructions: fields['Care Instructions'] || '',
            slug: fields['Slug'] || '',
        };
    },

    async getAllProducts() {
        return this.fetchRecords({
            sort: [
                { field: 'Product Name', direction: 'asc' },
            ],
            pageSize: AIRTABLE_CONFIG.DEFAULT_PAGE_SIZE,
        });
    },

    async getFeaturedProducts() {
        return this.fetchRecords({
            filterByFormula: '{Featured}=1',
            sort: [
                { field: 'Product Name', direction: 'asc' },
            ],
            pageSize: AIRTABLE_CONFIG.DEFAULT_PAGE_SIZE,
        });
    },

    async getProduct(identifier) {
        if (!identifier) return null;

        if (isAirtableRecordId(identifier)) {
            const byRecordId = await this.fetchRecordById(identifier);
            if (byRecordId) return byRecordId;
        }

        const safeIdentifier = escapeFormulaValue(identifier);
        const slugMatches = await this.fetchRecords({
            filterByFormula: `{Slug}='${safeIdentifier}'`,
            pageSize: 1,
        });
        if (slugMatches && slugMatches.length > 0) return slugMatches[0];

        const productIdMatches = await this.fetchRecords({
            filterByFormula: `{Product ID}='${safeIdentifier}'`,
            pageSize: 1,
        });
        if (productIdMatches && productIdMatches.length > 0) return productIdMatches[0];

        const nameMatches = await this.fetchRecords({
            filterByFormula: `{Product Name}='${safeIdentifier}'`,
            pageSize: 1,
        });
        if (nameMatches && nameMatches.length > 0) return nameMatches[0];

        return null;
    },
};

export default AirtableService;
