import Openrouteservice from 'openrouteservice-js'
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ORS_API_KEY } from '$env/static/private';


export const POST: RequestHandler = async ({ request }) => {
    const req = await request.json();

    const Isochrones = new Openrouteservice.Isochrones({
        api_key: ORS_API_KEY,
        timeout: 60000 // 60 second timeout for larger isochrone calculations
    })

    try {
        const json = await Isochrones.calculate(req);
        if (json) {
            return new Response(JSON.stringify(json), { status: 200 });
        }
        error(404, 'Not found');
    } catch (e) {
        console.error('Isochrone calculation error:', e);
        error(500, 'Failed to calculate isochrone');
    }
}