<script lang="ts">
	import maplibreGl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { User } from '$lib/types';
	import { m } from '$lib/state.svelte';
	import { onMount, untrack } from 'svelte';
	import Button from './ui/button/button.svelte';
	import Input from '$lib/components/ui/input/input.svelte';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as turf from '@turf/turf';
	import type { FeatureCollection, Point, GeoJsonProperties } from 'geojson';
	import Focus from "@lucide/svelte/icons/focus"
	import Target from "@lucide/svelte/icons/target"

	const { centerCoordinates = null } = $props();
	let diameterMiles: number = $state(10);
	let radiusMiles = $derived(diameterMiles / 2);

	let mapContainer = $state<HTMLElement | null>(null);
	let mapInstance = $state<maplibreGl.Map | undefined>();
	let focusOnClick = $state(true);
	let points: FeatureCollection<Point, GeoJsonProperties>;

	onMount(() => {
		if (mapContainer && !mapInstance) {
			const map = new maplibreGl.Map({
				container: mapContainer as HTMLElement,
				style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
				center: [centerCoordinates?.lng ?? -98.5795, centerCoordinates?.lat ?? 39.8283],
				zoom: 3, // Adjusted zoom level for US view
				attributionControl: false
			});

			map.on('load', () => {
				mapInstance = map;
				console.log('Map loaded and instance set.');
			});

			map!.on('click', (e: maplibreGl.MapMouseEvent & { lngLat: maplibreGl.LngLat }) => {
				// Check if click target is a marker element
				const target = e.originalEvent.target as HTMLElement;
				if (!target.closest('.maplibregl-marker')) {
					m.circleCenter = [e.lngLat.lng, e.lngLat.lat];
				}
			});

			map.on('error', (e) => {
				console.error('MapLibre error:', e);
			});
		}
		// Cleanup function, runs when the component is destroyed
		return () => {
			if (mapInstance) {
				console.log('onMount cleanup: Removing map.');
				mapInstance.remove();
			}
			mapInstance = undefined; // Clear the reactive state
		};
	});

	async function focusOnCircle() {
		if (!mapInstance || m.circleCenter.length == 0 || radiusMiles <= 0) return;

		const centerPoint = turf.point(m.circleCenter);
		const buffered = turf.buffer(centerPoint, radiusMiles, { units: 'miles' });
		const bbox = turf.bbox(buffered);

		mapInstance.fitBounds(
			[bbox[0], bbox[1], bbox[2], bbox[3]], // [[minLng, minLat], [maxLng, maxLat]]
			{
				padding: 200, // Optional padding
				duration: 1000 // Set duration to 500ms for faster animation
			}
		);
	}

	// --- Marker Management Effect ---
	// This effect runs whenever mapInstance or m.users changes.
	$effect(() => {
		console.log(
			'Marker effect triggered. mapInstance:',
			!!mapInstance,
			'm.users:',
			m.users ? m.users.length : 'null'
		);

		// Get current markers in an untracked way for cleanup
		const currentMarkers = untrack(() => m.userMarkers);

		// 1. Clean up existing markers from the map
		if (mapInstance && currentMarkers && currentMarkers.length > 0) {
			console.log(`Removing ${currentMarkers.length} old markers.`);
			currentMarkers.forEach(({ marker }) => {
				// Robust check for marker removal
				if (marker && typeof marker.remove === 'function') {
					marker.remove();
				}
			});
		}

		// 2. Decide whether to add new markers or clear the store
		if (!mapInstance || !m.users || m.users.length === 0) {
			// If map not ready, or no user data, ensure markers store is empty.
			// Check reactive store directly before writing to avoid unnecessary updates if already empty.
			if (untrack(() => m.userMarkers).length > 0) {
				console.log('Map not ready or no user data. Clearing m.userMarkers.');
				m.userMarkers = [];
			}
			return;
		}

		// 3. Add new markers based on m.users
		// mapInstance and m.users (with m.users.length > 0) are guaranteed to be valid here.
		console.log(`Processing ${m.users.length} users to create new markers.`);
		const newMarkerObjects: { user: User; marker: maplibreGl.Marker }[] = [];
		m.users.forEach((userData) => {
			const markerInstance = new maplibreGl.Marker({ color: 'hsl(var(--primary)/25%)' })
				.setLngLat([userData.lng, userData.lat])
				.addTo(mapInstance!);
			markerInstance._element.id = 'marker-' + userData.id.toString();
			const popup = new maplibreGl.Popup({ offset: 25 }).setText(
				`${userData.firstName} ${userData.lastName}`
			);
			markerInstance.setPopup(popup);
			newMarkerObjects.push({ user: userData, marker: markerInstance });
		});

		// Update the reactive state with the new marker objects
		m.userMarkers = newMarkerObjects;
		points = turf.featureCollection(
			newMarkerObjects.map(({ user }) => turf.point([user.lng, user.lat], { user }))
		);
		console.log(`Updated m.userMarkers with ${newMarkerObjects.length} new markers.`);
	});

	// run on search
	$effect(() => {
		console.log('2');
		if (mapInstance && centerCoordinates?.lat && centerCoordinates?.lng) {
			const newCenter: [number, number] = [centerCoordinates.lng, centerCoordinates.lat];
			mapInstance.setCenter(newCenter);
			// map.setZoom(12); // Optional: adjust zoom level after search
			m.circleCenter = newCenter;
			console.log('Map center updated from prop:', newCenter);
		}
	});

	$effect(() => {
		if (!mapInstance || m.circleCenter.length == 0) return;
		updateMapCenterAndRadius(m.circleCenter, radiusMiles); // radiusMiles is now derived
	});

	function updateMapCenterAndRadius(center: [number, number], currentRadiusMiles: number) {
		if (mapInstance !== undefined) {
			const radiusGeoJSONSourceId = 'radius-circle-source';
			const radiusFillLayerId = 'radius-circle-fill-layer';
			const radiusOutlineLayerId = 'radius-circle-outline-layer';

			const circleGeoJSON = turf.circle(center, currentRadiusMiles, { units: 'miles' });
			const source = mapInstance.getSource<maplibreGl.GeoJSONSource>(radiusGeoJSONSourceId);

			// check if circle has been drawn already, if so update data, if not draw circle
			if (source) {
				source.setData(circleGeoJSON);
			} else {
				mapInstance.addSource(radiusGeoJSONSourceId, {
					type: 'geojson',
					data: circleGeoJSON
				});

				mapInstance.addLayer({
					id: radiusFillLayerId,
					type: 'fill',
					source: radiusGeoJSONSourceId,
					paint: {
						'fill-color': 'hsl(217.2 32.6% 17.5%)',
						'fill-opacity': 0.3
					}
				});

				mapInstance.addLayer({
					id: radiusOutlineLayerId,
					type: 'line',
					source: radiusGeoJSONSourceId,
					paint: {
						'line-color': 'hsl(217.2 32.6% 17.5%)',
						'line-width': 3
					}
				});
			}

			// reset color of markers that were in the previous circle
			// todo: figure out a better way than to loop through entire user, using m.nearbyusers is causing infinite effect call
			m.users.forEach((user) => {
				const svgPath: SVGAElement | null = m.userMarkers[user.id].marker
					.getElement()
					.querySelector('svg path');
				if (svgPath) svgPath.style.fill = 'hsl(var(--primary)/25%)';
			});

			let nearbyUsers: User[] = [];
			const pointsInCircle = turf.pointsWithinPolygon(points, circleGeoJSON);
			pointsInCircle.features.forEach((feature) => {
				nearbyUsers.push(feature.properties.user);
				const svgPath: SVGAElement | null = m.userMarkers[feature.properties.user.id].marker
					.getElement()
					.querySelector('svg path');
				if (svgPath) svgPath.style.fill = 'hsl(var(--primary))';
			});

			m.nearbyUsers = nearbyUsers;

			if (focusOnClick) {
				focusOnCircle();
			}
		}
	}
</script>

<!-- todo: have sidebar be a child of map component instead of main page, then I can pass props down instead of having to have global state -->
<div class="h-full w-full" bind:this={mapContainer}></div>

<Button
	onclick={focusOnCircle}
	size="icon"
	class="absolute bottom-4 left-4"
	title="Focus on Circle"
>
	<Focus />
</Button>
<Button
	onclick={() => {
		focusOnClick = !focusOnClick;
	}}
	size="icon"
	variant="secondary"
	class="absolute bottom-4 left-16"
	title="Toggle Focus on Click"
>
	{#if focusOnClick}
		<svg
			xmlns="http://www.w3.org/2000/svg"
			width="24"
			height="24"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			stroke-linecap="round"
			stroke-linejoin="round"
			class="lucide lucide-target"
			><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle
				cx="12"
				cy="12"
				r="2"
			/></svg
		>
	{:else}
		<Target />
	{/if}
</Button>

<div class="absolute bottom-4 left-28 flex h-10 items-center gap-1 rounded-md bg-background px-2">
	<Label for="diameter-input">Diameter (miles)</Label>
	<Input
		id="diameter-input"
		type="number"
		min={1}
		bind:value={diameterMiles}
		class="h-7 w-20 border-foreground/50 py-0"
	/>
</div>

<style>
	/* Make default marker popups a bit more styled if needed */
	:global(.maplibregl-popup-content) {
		padding: 1rem 12px;
		width: fit-content;
		color: black;
	}
	:global(.maplibregl-popup-close-button) {
		padding: 0 0.3rem;
	}
</style>
