import { SvelteKitAuth } from "@auth/sveltekit";
import Entra from "@auth/sveltekit/providers/microsoft-entra-id"
import { AUTH_MICROSOFT_ENTRA_ID_ID, AUTH_MICROSOFT_ENTRA_ID_SECRET, AUTH_MICROSOFT_ENTRA_ID_ISSUER } from "$env/static/private"

export const { handle, signIn, signOut } = SvelteKitAuth({
    providers: [
      Entra({
        clientId: AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: AUTH_MICROSOFT_ENTRA_ID_SECRET,
        issuer: AUTH_MICROSOFT_ENTRA_ID_ISSUER
      }),
    ],
    callbacks: {
      async redirect({ baseUrl }) {
        // After sign in, redirect here
        return baseUrl + "/authenticated";
      }
    },
    pages: {
      signIn: "/login"
    },
    trustHost: true
  })
