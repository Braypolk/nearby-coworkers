<script lang="ts">
	import Button from '$lib/components/ui/button/button.svelte';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import SidebarLeft from '$lib/components/sidebar-left.svelte';
	import Map from '$lib/components/Map.svelte';
	
	import type { User } from '$lib/types';
	import { m } from '$lib/state.svelte';

	let diameterMiles: number = $state(10); // Default to 6 miles, so radius is 3 miles (approx 5 km)
	let nearbyUsers: User[] = $state([]);
	let mapComponent: Map; // To call exported functions if needed, e.g. for an initial explicit update
	let searchedCoordinates: { lat: number; lng: number } | null = $state(null);
	let addressQuery: string = $state('');
	let isSearchingAddress: boolean = $state(false);

	async function searchAddress() {
		if (!addressQuery.trim()) {
			alert('Please enter an address.');
			return;
		}
		isSearchingAddress = true;
		try {
			const response = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(addressQuery)}&limit=1`
			);
			if (!response.ok) {
				throw new Error(`Geocoding failed: ${response.statusText}`);
			}
			const data = await response.json();
			if (data && data.length > 0) {
				const { lat, lon } = data[0];
				searchedCoordinates = { lat: parseFloat(lat), lng: parseFloat(lon) };
			} else {
				alert('Address not found.');
				searchedCoordinates = null;
			}
		} catch (error) {
			console.error('Error searching address:', error);
			alert('Failed to search address. See console for details.');
			searchedCoordinates = null;
		} finally {
			isSearchingAddress = false;
		}
	}

	function handleNearbyUsersUpdate(users: User[], markers = []) {
		nearbyUsers = users;
		m.userMarkers = markers;
	}
</script>

<Sidebar.Provider>
	<SidebarLeft {nearbyUsers} />
	<Sidebar.Inset>
		<header class="sticky top-0 flex h-14 shrink-0 items-center gap-2 bg-background">
			<div class="flex flex-1 items-center gap-2 px-3">
				<Sidebar.Trigger />
				<Separator orientation="vertical" class="mr-2 h-4" />
				<div class="flex grow gap-2">
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

				<div class="w-36 flex">
					<Label for="diameter-input">Diameter (miles)</Label>
					<Input
						id="diameter-input"
						type="number"
						min={1}
						bind:value={diameterMiles}
						class="w-20 py-0 h-7"
					/>
				</div>
			</div>
		</header>
		<Map
			bind:this={mapComponent}
			{diameterMiles}
			onNearbyUsersUpdate={handleNearbyUsersUpdate}
			centerCoordinates={searchedCoordinates}
		/>
	</Sidebar.Inset>
</Sidebar.Provider>