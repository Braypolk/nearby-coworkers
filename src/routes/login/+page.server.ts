import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }: { locals: App.Locals }) => {
  const session = await locals.auth();
	if (session?.user?.name) {
    redirect(303, `/authenticated`)
  }
};
