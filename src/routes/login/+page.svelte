<script lang="ts">
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button';
	import NpgLogoBw from '$lib/images/npgLogoBW.svelte';

	import LightSwitch from '$lib/components/light-switch.svelte';
	import { signIn } from '@auth/sveltekit/client';
</script>

<div class="flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
	<div class="absolute right-4 top-4">
		<LightSwitch />
	</div>
	<Card class="w-full max-w-md bg-secondary">
		<CardHeader>
			<CardTitle class="text-center text-2xl">NPG Nearby</CardTitle>
		</CardHeader>
		<CardContent class="mt-6">
			<div class="mt-6">
				<Button variant="default" class="w-full" onclick={() => signIn('microsoft-entra-id')}>
					<NpgLogoBw />
					Sign in with NPG
				</Button>
			</div>
		</CardContent>
	</Card>
</div>
