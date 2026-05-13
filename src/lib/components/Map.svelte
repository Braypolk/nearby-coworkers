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
	import Focus from '@lucide/svelte/icons/focus';
	import Target from '@lucide/svelte/icons/target';
	import Route from '@lucide/svelte/icons/route';
	import Loader2 from '@lucide/svelte/icons/loader-2';
	import { cn } from '$lib/utils';
	import { useSidebar } from '$lib/components/ui/sidebar/context.svelte';
	import { clearIsochrone, renderIsochrone, fetchIsochrone } from '$lib/map-utils';
	import { userPassesLpCurrentTierFilter } from '$lib/lp-status-filter';

	const { centerCoordinates = null } = $props();
	const sidebar = useSidebar();
	let diameterMiles: number = $state(10);
	let radiusMiles = $derived(diameterMiles / 2);
	
	// Isochrone state
	let isCalculatingIsochrone = $state(false);
	let isochroneMinutes = $state(15); // Default 15 minutes driving
	let isIsochroneVisible = $state(false); // Track if isochrone is currently displayed

	let mapContainer = $state<HTMLElement | null>(null);
	let mapInstance = $state<maplibreGl.Map | undefined>();
	let focusOnClick = $state(true);
	let points: FeatureCollection<Point, GeoJsonProperties>;

	// todo: implement different maps, something like this https://github.com/leoneljdias/maplibre-gl-style-flipper
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
			});

		map!.on('click', (e: maplibreGl.MapMouseEvent & { lngLat: maplibreGl.LngLat }) => {
			// Check if click target is a marker element
			const target = e.originalEvent.target as HTMLElement;
			if (!target.closest('.maplibregl-marker')) {
				// Clear isochrone when clicking a new point
				if (isIsochroneVisible && clearIsochrone(mapInstance)) {
					isIsochroneVisible = false;
				}
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
				mapInstance.remove();
			}
			mapInstance = undefined;
		};
	});

	async function focusOnCircle() {
		if (!mapInstance || m.circleCenter.length == 0 || radiusMiles <= 0) return;

		const centerPoint = turf.point(m.circleCenter);
		const buffered = turf.buffer(centerPoint, radiusMiles, { units: 'miles' });
		if (!buffered) return;

		const bbox = turf.bbox(buffered);

		mapInstance.fitBounds(
			[bbox[0], bbox[1], bbox[2], bbox[3]], // [[minLng, minLat], [maxLng, maxLat]]
			{
				padding: sidebar.isMobile ? 40 : 200, // Optional padding
				duration: 1000 // Set duration to 500ms for faster animation
			}
		);
	}

	// Marker Management Effect - runs whenever mapInstance, m.users, or LP filter changes
	$effect(() => {
		const filterLp = m.filterLpCurrentTier;
		const currentMarkers = untrack(() => m.userMarkers);

		// Clean up existing markers from the map
		if (mapInstance && currentMarkers && Object.keys(currentMarkers).length > 0) {
			Object.values(currentMarkers).forEach(({ marker }) => {
				if (marker && typeof marker.remove === 'function') {
					marker.remove();
				}
			});
		}

		// If map not ready or no user data, clear markers store
		if (!mapInstance || !m.users || m.users.length === 0) {
			if (Object.keys(untrack(() => m.userMarkers)).length > 0) {
				m.userMarkers = {};
			}
			return;
		}

		const usersOnMap = m.users.filter((u) => userPassesLpCurrentTierFilter(u, filterLp));

		// Add new markers based on visible users
		const newMarkerObjects: Record<number, { user: User; marker: maplibreGl.Marker }> = {};
		usersOnMap.forEach((userData) => {
			const markerInstance = new maplibreGl.Marker({ color: 'hsl(var(--primary)/25%)' })
				.setLngLat([userData.lng, userData.lat])
				.addTo(mapInstance!);
			markerInstance._element.id = 'marker-' + userData.id.toString();
			const popup = new maplibreGl.Popup({ offset: 25 }).setHTML(
				`<p class="text-base">${userData.firstName} ${userData.lastName}<p>
				 <p class="text-xs text-gray-700">${userData.title}<p>`
			);
			markerInstance.setPopup(popup);
			newMarkerObjects[userData.id] = { user: userData, marker: markerInstance };
		});

		m.userMarkers = newMarkerObjects;
		points = turf.featureCollection(
			Object.values(newMarkerObjects).map(({ user }) => turf.point([user.lng, user.lat], { user }))
		);
	});

	// Update map center when search coordinates change
	$effect(() => {
		if (mapInstance && centerCoordinates?.lat && centerCoordinates?.lng) {
			const newCenter: [number, number] = [centerCoordinates.lng, centerCoordinates.lat];
			mapInstance.setCenter(newCenter);
			if (isIsochroneVisible && clearIsochrone(mapInstance)) {
				isIsochroneVisible = false;
			}
			m.circleCenter = newCenter;
		}
	});

	$effect(() => {
		if (!mapInstance || m.circleCenter.length == 0) return;
		m.filterLpCurrentTier; // re-run range / nearby when LP filter toggles (after markers refresh points)
		updateMapCenterAndRadius(m.circleCenter, radiusMiles); // radiusMiles is now derived
	});

	async function calculateIsochroneHandler() {
		if (!mapInstance || m.circleCenter.length === 0) return;
		
		isCalculatingIsochrone = true;
		try {
			const data = await fetchIsochrone(m.circleCenter as [number, number], isochroneMinutes);
			renderIsochrone(mapInstance, data, { padding: sidebar.isMobile ? 40 : 200, duration: 1000 });
			isIsochroneVisible = true;
			
			// Update nearby users based on isochrone polygon
			if (data.features && data.features.length > 0) {
				updateNearbyUsers(data.features[0] as GeoJSON.Feature<GeoJSON.Polygon>);
			}
		} catch (error) {
			console.error('Isochrone calculation error:', error);
		} finally {
			isCalculatingIsochrone = false;
		}
	}
	
	/** Update nearby users and marker colors based on a polygon */
	function updateNearbyUsers(polygon: GeoJSON.Feature<GeoJSON.Polygon>) {
		const pointsInPolygon = turf.pointsWithinPolygon(points, polygon);
		const newNearbyUsers: User[] = pointsInPolygon.features
			.filter((feature) => feature.properties?.user)
			.map((feature) => feature.properties!.user);
		const newNearbyIds = new Set(newNearbyUsers.map((u) => u.id));

		// Reset colors for users that were previously nearby but aren't anymore
		const previousNearbyUsers = untrack(() => m.nearbyUsers);
		previousNearbyUsers.forEach((user) => {
			if (!newNearbyIds.has(user.id)) {
				const markerData = m.userMarkers[user.id];
				if (markerData) {
					const svgPath: SVGAElement | null = markerData.marker
						.getElement()
						.querySelector('svg path');
					if (svgPath) svgPath.style.fill = 'hsl(var(--primary)/25%)';
				}
			}
		});

		// Highlight markers that are now in the polygon
		newNearbyUsers.forEach((user) => {
			const markerData = m.userMarkers[user.id];
			if (markerData) {
				const svgPath: SVGAElement | null = markerData.marker
					.getElement()
					.querySelector('svg path');
				if (svgPath) svgPath.style.fill = 'hsl(var(--primary))';
			}
		});

		m.nearbyUsers = newNearbyUsers;
	}

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

			// Update nearby users based on circle
			updateNearbyUsers(circleGeoJSON);

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
	class={cn("absolute bottom-4 left-16", focusOnClick ? "bg-background" : "bg-secondary")}
	title="Toggle Focus on Click"
>
	{#if focusOnClick}
		<Target />
	{:else}
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
		>
			<line x1="0" y1="0" x2="24" y2="24" stroke-width="2" />
			<circle cx="12" cy="12" r="10" />
			<circle cx="12" cy="12" r="6" />
			<circle cx="12" cy="12" r="2" />
		</svg>
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

<!-- Isochrone Controls - Bottom Right -->
<div class="absolute bottom-4 right-4 flex items-center gap-2">
	<div class="flex h-10 items-center gap-1 rounded-md bg-background px-2">
		<Label for="isochrone-input" class="text-sm whitespace-nowrap">Travel time (min)</Label>
		<Input
			id="isochrone-input"
			type="number"
			min={5}
			max={60}
			bind:value={isochroneMinutes}
			class="h-7 w-16 border-foreground/50 py-0"
		/>
	</div>
	<Button
		onclick={calculateIsochroneHandler}
		size="icon"
		disabled={isCalculatingIsochrone || m.circleCenter.length === 0}
		title="Calculate Isochrone"
		class="bg-emerald-600 hover:bg-emerald-700"
	>
		{#if isCalculatingIsochrone}
			<Loader2 class="animate-spin" />
		{:else}
			<Route />
		{/if}
	</Button>
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
