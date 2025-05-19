<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import type { ComponentProps } from 'svelte';
	import LightSwitch from './light-switch.svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { m } from '$lib/state.svelte';
	import type { User } from '$lib/types';

	const SESSION_STORAGE_KEY = 'cachedUsers';

	let {
		ref = $bindable(null),
		nearbyUsers = [],
		...restProps
	}: ComponentProps<typeof Sidebar.Root> = $props();

	let currentTab = $state('emp-all');

	// Load users from session storage on component initialization
	$effect.pre(() => {
		const cachedUsers = sessionStorage.getItem(SESSION_STORAGE_KEY);
		if (cachedUsers) {
			try {
				m.users = JSON.parse(cachedUsers);
			} catch (error) {
				console.error('Error parsing cached users from session storage:', error);
				sessionStorage.removeItem(SESSION_STORAGE_KEY); // Clear invalid data
			}
		}
	});

	function handlePersonClick(id: number) {
		// todo: fix: slow, gross way to do this
		m.userMarkers.forEach((marker) => {
			if (marker.marker.getPopup().isOpen() && marker.user.id !== id) {
				marker.marker.togglePopup();
			}
		});

		m.userMarkers[id - 1].marker.togglePopup();
	}

	function exportCSV() {
		if (nearbyUsers.length === 0) {
			alert('No users to export.');
			return;
		}

		const header = 'ID,Name,Latitude,Longitude\n';
		const rows = nearbyUsers
			.map((u) => `${u.id},${u.name},${u.lat.toFixed(4)},${u.lng.toFixed(4)}`)
			.join('\n');
		const csv = header + rows;
		const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
		const link = document.createElement('a');
		const url = URL.createObjectURL(blob);
		link.setAttribute('href', url);
		link.setAttribute('download', 'nearby_users.csv');
		link.style.visibility = 'hidden';
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	}

	async function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files?.length) return;

		const file = input.files[0];
		try {
			const text = await file.text();
			const rows = text.split('\n').filter((row) => row.trim() !== '');
			const headers = rows[0].split(',').map((h) => h.trim().toLowerCase());
			let nextId = 1;

			m.users = rows.slice(1).map((row) => {
				const values = row.split(',');
				const entry: any = {};

				headers.forEach((header, index) => {
					if (values[index]) {
						// Map latitude/longitude to lat/lng
						const normalizedHeader =
							header === 'latitude' ? 'lat' : header === 'longitude' ? 'lng' : header;
						entry[normalizedHeader] = values[index].trim();
					}
				});

				// Convert numeric fields
				if (entry.lat) entry.lat = parseFloat(entry.lat);
				if (entry.lng) entry.lng = parseFloat(entry.lng);

				// Assign or validate ID
				const parsedId = parseInt(entry.id);
				if (entry.id && !isNaN(parsedId)) {
					entry.id = parsedId;
				} else {
					entry.id = nextId++;
				}

				return entry;
			});

			// Cache the users in session storage
			sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(m.users));
		} catch (error) {
			console.error('Error parsing CSV:', error);
		}
	}
</script>

{#snippet menuButton(u: User[])}
	{#each u as item (item.name)}
		<Sidebar.MenuItem>
			<Button
				variant="ghost"
				class="h-16 w-full justify-normal"
				onclick={() => handlePersonClick(item.id)}
			>
				<div class="text-left">
					<p class="text-lg">{item.name}</p>
					{#if item.address}
						<p class="text-xs text-foreground/70">{item.address}</p>
					{:else}
						<p class="text-xs text-foreground/70">{item.lat}, {item.lng}</p>
					{/if}
				</div>
			</Button>
		</Sidebar.MenuItem>
	{/each}
{/snippet}

<Sidebar.Root class="border-r-0" {...restProps}>
	<Sidebar.Header>
		<div class="flex justify-between">
			<ToggleGroup.Root bind:value={currentTab} type="single" class="grow">
				<ToggleGroup.Item value="emp-rad" aria-label="Toggle emp-rad" class="grow">
					Employees within Radius
				</ToggleGroup.Item>
				<ToggleGroup.Item value="emp-all" aria-label="Toggle emp-all" class="grow">
					All Employees
				</ToggleGroup.Item>
			</ToggleGroup.Root>
			<LightSwitch />
		</div>
	</Sidebar.Header>

	<Sidebar.Content>
		<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
			{#if currentTab === 'emp-rad'}
				<Sidebar.GroupLabel>Employees within radius: ({nearbyUsers.length})</Sidebar.GroupLabel>
				<Sidebar.Menu>
					{@render menuButton(nearbyUsers)}
				</Sidebar.Menu>
			{:else}
				<Sidebar.GroupLabel>Number of Employees: ({m.users.length})</Sidebar.GroupLabel>
				<Sidebar.Menu>
					{@render menuButton(m.users)}
				</Sidebar.Menu>
			{/if}
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Footer>
		{#if currentTab === 'emp-rad'}
			<Button onclick={exportCSV}>Export</Button>
		{:else}
			<Input id="file" type="file" onchange={handleFileUpload} accept=".csv" />
		{/if}
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>
