import { KV_REST_API_URL, KV_REST_API_TOKEN } from "$env/static/private";
import type { User } from "$lib/types";
import type { PageServerLoad } from './$types';
import { Redis } from '@upstash/redis';

// Initialize Redis
const redis = new Redis({
  url: KV_REST_API_URL || "",
  token: KV_REST_API_TOKEN || ""
});

export const load: PageServerLoad = async ({ locals }: { locals: App.Locals }) => {
  const session = await locals.auth();
	return {
		post: (await redis.get("users")) as User[],
    session
    // post: [
    //   {
    //     "id": 0,
    //     "lastName": "Smith",
    //     "firstName": "John",
    //     "city": "Los Angeles",
    //     "state": "CA",
    //     "zipCode": 90290,
    //     "lat": 34.093049,
    //     "lng": -118.600033
    //   },
    //   {
    //     "id": 1,
    //     "lastName": "Blart",
    //     "firstName": "Paul",
    //     "city": "Los Angeles",
    //     "state": "CA",
    //     "zipCode": 90290,
    //     "lat": 34.0931,
    //     "lng": -117.901
    //   }
    // ]
	};
};