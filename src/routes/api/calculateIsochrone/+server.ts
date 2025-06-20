import Openrouteservice from 'openrouteservice-js'
import { error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';


export const POST: RequestHandler = async ({ request }) => {
    const req = await request.json();
    console.log(req);

    const Isochrones = new Openrouteservice.Isochrones({
        host: "http://localhost:5412/ors"
    })

    const json = await Isochrones.calculate(req)
    if (json) {
        return new Response(JSON.stringify(json), { status: 200 });
    }
    error(404, 'Not found');
}