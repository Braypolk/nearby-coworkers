<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import SidebarLeft from '$lib/components/sidebar-left.svelte';
	import Map from '$lib/components/Map.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { signOut } from '@auth/sveltekit/client';
	import Settings from '@lucide/svelte/icons/settings';
	import { toggleMode } from 'mode-watcher';

	import { m } from '$lib/state.svelte';

	import type { PageProps } from './$types';
	import Sun from '@lucide/svelte/icons/sun';
	import Moon from '@lucide/svelte/icons/moon';

	let mapComponent: Map;
	let searchedCoordinates: { lat: number; lng: number } | null = $state(null);
	let addressQuery: string = $state('');
	let isSearchingAddress: boolean = $state(false);

	// TOOD: eventually change to first check if users are in cache, if not pull from db
	let { data }: PageProps = $props();
	m.users = data.post;

		async function searchAddress() {
			if (!addressQuery.trim()) {
				alert('Please enter an address.');
				return;
			}

			isSearchingAddress = true;
			try {
				const response = await fetch(`/api/radar?address=${addressQuery}`);
			if (!response.ok) {
				throw new Error(`Geocoding failed: ${response.statusText}`);
			}
			const { addresses } = await response.json();
			if (addresses && addresses.length > 0) {
				searchedCoordinates = { lat: addresses[0].latitude, lng: addresses[0].longitude };
			} else {
				alert('Address not found.');
				searchedCoordinates = null;
			}
		} catch (error) {
			console.error('Error searching address:', error);
			alert('Failed to search address');
			searchedCoordinates = null;
		} finally {
			isSearchingAddress = false;
		}
	}
</script>

<Sidebar.Provider>
	<SidebarLeft />
	<Sidebar.Inset>
		<header class="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
			<div class="flex flex-1 items-center gap-2 px-3">
				<Sidebar.Trigger />
				<Separator orientation="vertical" class="mr-2 h-4" />
				<div class="flex grow gap-2">
					<!-- TODO: add autocomplete functionality with suggestions -->
					<Input
						class="max-w-[400px]"
						id="address-search"
						type="text"
						bind:value={addressQuery}
						placeholder="Click on Map or Give an Address"
						onkeydown={(event) => {
							if (event.key === 'Enter') {
								searchAddress();
							}
						}}
					/>
					<Button onclick={searchAddress} disabled={isSearchingAddress}>
						{#if isSearchingAddress}
							Searching...
						{:else}
							Search
						{/if}
					</Button>
				</div>
				<DropdownMenu.Root>
					<DropdownMenu.Trigger><Settings /></DropdownMenu.Trigger>
					<DropdownMenu.Content>
						<DropdownMenu.Group>
							<DropdownMenu.Label>Hi {data.session?.user?.name}</DropdownMenu.Label>
							<DropdownMenu.Item onSelect={toggleMode} closeOnSelect={false}>
								Toggle theme
								<!-- <LightSwitch/> -->
								<div class="inline-flex items-center justify-center">
									<Sun
										class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
									/>
									<Moon
										class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
									/>
								</div>
							</DropdownMenu.Item>
							<DropdownMenu.Separator />
							<DropdownMenu.Item onSelect={() => signOut()}>Sign Out</DropdownMenu.Item>
						</DropdownMenu.Group>
					</DropdownMenu.Content>
				</DropdownMenu.Root>
			</div>
		</header>
		<Map bind:this={mapComponent} centerCoordinates={searchedCoordinates} />
	</Sidebar.Inset>
</Sidebar.Provider>
