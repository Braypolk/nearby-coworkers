import { redirect, type Handle } from '@sveltejs/kit';
import { handle as authenticationHandle } from './auth';
import { sequence } from '@sveltejs/kit/hooks';
 
async function authorizationHandle({ event, resolve }: Parameters<Handle>[0]) {
  // Protect any routes under /authenticated
  if (event.url.pathname.startsWith('/authenticated')) {
    const session = await event.locals.auth();    
    if (!session) {
      // Redirect to the signin page
      throw redirect(303, 'login');
    }
  }
 
  const response = await resolve(event);

  // If the request is still here, just proceed as normally
  if (response.status === 404) {
    throw redirect(303, '/authenticated');
  }

  return response;
}
 
// First handle authentication, then authorization
// Each function acts as a middleware, receiving the request handle
// And returning a handle which gets passed to the next function
export const handle: Handle = sequence(authenticationHandle, authorizationHandle)