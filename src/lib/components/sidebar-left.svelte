<script lang="ts">
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import Button from '$lib/components/ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import type { ComponentProps } from 'svelte';
	import * as ToggleGroup from '$lib/components/ui/toggle-group/index.js';
	import { m } from '$lib/state.svelte';
	import type { User } from '$lib/types';

	let { ref = $bindable(null), ...restProps }: ComponentProps<typeof Sidebar.Root> = $props();

	let currentTab = $state('emp-all');
	let searchTerm = $state('');

	// TODO: change how id's are assign and popups are accessed, currently, id is just the arrary position, not a good way to do this
	function handlePersonClick(id: number) {
		// todo: fix: slow, gross way to do this
		m.userMarkers.forEach((marker) => {
			if (marker.marker.getPopup().isOpen() && marker.user.id !== id) {
				marker.marker.togglePopup();
			}
		});
		m.userMarkers[id].marker.togglePopup();
		// TODO: can this be reworked so I don't have to have circleCenter be stored as shared state?
		m.circleCenter = m.userMarkers[id].marker.getLngLat().toArray();
	}

	const filteredAllUsers = $derived(
		m.users.filter(
			(user) =>
				user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);

	const filteredNearbyUsers = $derived(
		m.nearbyUsers.filter(
			(user) =>
				user.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
				user.firstName.toLowerCase().includes(searchTerm.toLowerCase())
		)
	);
</script>

{#snippet menuButton(u: User[])}
	{#each u as item}
		<Sidebar.MenuItem>
			<Button
				variant="ghost"
				class="h-16 w-full justify-normal"
				onclick={() => handlePersonClick(item.id)}
			>
				<div class="text-left">
					<p class="text-lg">{item.firstName} {item.lastName}</p>
					<p class="text-xs text-foreground/70">{item.city}, {item.state}, {item.zipCode}</p>
				</div>
			</Button>
		</Sidebar.MenuItem>
	{/each}
{/snippet}

<Sidebar.Root class="border-r-0" {...restProps}>
	<Sidebar.Header>
		<div class="flex justify-between gap-1">
			<ToggleGroup.Root bind:value={currentTab} type="single" class="grow">
				<ToggleGroup.Item
					value="emp-rad"
					aria-label="Toggle emp-rad"
					class="grow data-[state=on]:bg-primary/40"
				>
					Employees in Circle ({filteredNearbyUsers.length})
				</ToggleGroup.Item>
				<ToggleGroup.Item
					value="emp-all"
					aria-label="Toggle emp-all"
					class="grow data-[state=on]:bg-primary/40"
				>
					All Employees
				</ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>
	</Sidebar.Header>
	<Sidebar.Separator class="bg-primary/60" />
	<Sidebar.Content>
		<div class="mt-2 px-4">
			<Input
				type="search"
				placeholder="Search employees..."
				bind:value={searchTerm}
				class="w-full"
			/>
		</div>
		<Sidebar.Group class="group-data-[collapsible=icon]:hidden">
			{#if currentTab === 'emp-rad'}
				<Sidebar.GroupLabel
					>Employees within Circle: ({filteredNearbyUsers.length})</Sidebar.GroupLabel
				>
				<Sidebar.Menu>
					{@render menuButton(filteredNearbyUsers)}
				</Sidebar.Menu>
			{:else}
				<Sidebar.GroupLabel>Number of Employees: ({filteredAllUsers.length})</Sidebar.GroupLabel>
				<Sidebar.Menu>
					{@render menuButton(filteredAllUsers)}
				</Sidebar.Menu>
			{/if}
		</Sidebar.Group>
	</Sidebar.Content>
	<Sidebar.Rail />
	<div
		class="absolute -right-2 top-1/2 flex h-24 w-3 -translate-y-1/2 cursor-pointer items-center justify-center rounded-full bg-background"
	>
		<div class="h-8 w-0.5 rounded-full bg-gray-400"></div>
	</div>
</Sidebar.Root>
