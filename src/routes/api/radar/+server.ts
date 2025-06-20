import type { RequestHandler } from './$types';
import { RADAR_AUTH } from '$env/static/private';

export const GET: RequestHandler = async ({ url }) => {
    const address = url.searchParams.get('address');

    if (!address) {
        return new Response(JSON.stringify({ error: 'address is required' }), { status: 400 });
    }

    try {
        const response = await fetch(
            `https://api.radar.io/v1/search/autocomplete?query=${address}`,
            {
                headers: {
                    Authorization: RADAR_AUTH
                }
            }
        );
        const result = await response.json();
        return new Response(JSON.stringify(result), { status: response.status });
    } catch (error) {
        console.error('Error fetching autocomplete data:', error);
        return new Response(JSON.stringify({ error: 'Failed to fetch address' }), { status: 500 });
    }
};