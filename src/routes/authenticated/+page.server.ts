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
	};
};
