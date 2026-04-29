const AIRTABLE_API_BASE = 'https://api.airtable.com/v0';

function json(statusCode, body) {
    return {
        statusCode,
        headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-store',
        },
        body: JSON.stringify(body),
    };
}

function getAuthConfig() {
    const token = process.env.AIRTABLE_TOKEN;
    const baseId = process.env.AIRTABLE_BASE_ID;
    const tableName = process.env.AIRTABLE_TABLE_NAME || 'Products';

    if (!token || !baseId) {
        return { error: 'Missing AIRTABLE_TOKEN or AIRTABLE_BASE_ID environment variables.' };
    }

    return { token, baseId, tableName };
}

function buildUpstreamUrl(path, query) {
    const url = new URL(`${AIRTABLE_API_BASE}${path}`);
    for (const [key, value] of query.entries()) {
        if (key === 'path') continue;
        url.searchParams.append(key, value);
    }
    return url.toString();
}

module.exports = async (req, res) => {
    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    const config = getAuthConfig();
    if (config.error) {
        res.status(500).json({ error: config.error });
        return;
    }

    const query = new URLSearchParams(req.query || {});
    const path = query.get('path');

    if (!path || !path.startsWith('/')) {
        res.status(400).json({ error: 'Missing or invalid path parameter.' });
        return;
    }

    const upstreamUrl = buildUpstreamUrl(path, query);

    const response = await fetch(upstreamUrl, {
        headers: {
            Authorization: `Bearer ${config.token}`,
        },
    });

    const text = await response.text();
    res.status(response.status);
    res.setHeader('Content-Type', response.headers.get('content-type') || 'application/json');
    res.setHeader('Cache-Control', 'no-store');
    res.send(text);
};
