import { SvelteKitAuth } from "@auth/sveltekit";
import Entra from "@auth/sveltekit/providers/microsoft-entra-id"
import { env } from "$env/dynamic/private"

export const { handle, signIn, signOut } = SvelteKitAuth({
    providers: [
      Entra({
        clientId: env.AUTH_MICROSOFT_ENTRA_ID_ID,
        clientSecret: env.AUTH_MICROSOFT_ENTRA_ID_SECRET,
        issuer: env.AUTH_MICROSOFT_ENTRA_ID_ISSUER
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
    }
  })
