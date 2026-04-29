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

exports.handler = async (event) => {
    if (event.httpMethod !== 'GET') {
        return json(405, { error: 'Method not allowed' });
    }

    const config = getAuthConfig();
    if (config.error) {
        return json(500, { error: config.error });
    }

    const query = new URLSearchParams(event.queryStringParameters || {});
    const path = query.get('path');

    if (!path || !path.startsWith('/v0/')) {
        return json(400, { error: 'Missing or invalid path parameter.' });
    }

    const upstreamUrl = buildUpstreamUrl(path, query);

    const response = await fetch(upstreamUrl, {
        headers: {
            Authorization: `Bearer ${config.token}`,
        },
    });

    const text = await response.text();
    return {
        statusCode: response.status,
        headers: {
            'Content-Type': response.headers.get('content-type') || 'application/json',
            'Cache-Control': 'no-store',
        },
        body: text,
    };
};
