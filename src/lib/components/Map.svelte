<script lang="ts">
	import maplibreGl from 'maplibre-gl';
	import 'maplibre-gl/dist/maplibre-gl.css';
	import type { User } from '$lib/types';
	import { m } from '$lib/state.svelte';
	import { onMount, untrack } from 'svelte';

	const { radiusMiles, onNearbyUsersUpdate = () => {}, centerCoordinates = null } = $props();

	let mapContainer = $state<HTMLElement | null>(null);
	let mapInstance = $state<maplibreGl.Map | null>(null);
	let circleCenter = $state(radiusMiles);
	const radiusGeoJSONSourceId = 'radius-circle-source'; // Renamed for clarity
	const radiusFillLayerId = 'radius-circle-fill-layer';
	const radiusOutlineLayerId = 'radius-circle-outline-layer';
	let nearbyUsersList: User[] = [];

	// let userMarkers: { user: User; marker: maplibreGl.Marker }[] = $state([]);

	// onMount(() => {
	onMount(() => {
		if (mapContainer && !mapInstance) {
			const map = new maplibreGl.Map({
				container: mapContainer,
				style: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
				center: [centerCoordinates?.lng ?? -98.5795, centerCoordinates?.lat ?? 39.8283],
				zoom: 3 // Adjusted zoom level for US view
			});

			map.on('load', () => {
				mapInstance = map;
				console.log('Map loaded and instance set.');
			});

			map!.on('click', (e: maplibreGl.MapMouseEvent & { lngLat: maplibreGl.LngLat }) => {
				// Check if click target is a marker element
				const target = e.originalEvent.target as HTMLElement;
				if (!target.closest('.maplibregl-marker')) {
					circleCenter = [e.lngLat.lng, e.lngLat.lat];
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
			mapInstance = null; // Clear the reactive state
		};
	});

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
			const markerInstance = new maplibreGl.Marker()
				.setLngLat([userData.lng, userData.lat])
				.addTo(mapInstance);

			if (userData.name) {
				const popup = new maplibreGl.Popup({ offset: 25 }).setText(userData.name);
				markerInstance.setPopup(popup);
			}
			newMarkerObjects.push({ user: userData, marker: markerInstance });
		});

		// Update the reactive state with the new marker objects
		m.userMarkers = newMarkerObjects;
		console.log(`Updated m.userMarkers with ${newMarkerObjects.length} new markers.`);
	});

	// maybe has to do with search
	$effect(() => {
		if (mapInstance && centerCoordinates && centerCoordinates.lat && centerCoordinates.lng) {
			const newCenter: [number, number] = [centerCoordinates.lng, centerCoordinates.lat];
			mapInstance.setCenter(newCenter);
			// map.setZoom(12); // Optional: adjust zoom level after search
			circleCenter = newCenter;
			console.log('Map center updated from prop:', newCenter);
		}
	});

	$effect(() => {
		if (mapInstance && circleCenter) {
			updateMapCenterAndRadius(circleCenter, radiusMiles);
		}
	});

	function getDistanceInMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
		const R = 3959; // Radius of the Earth in miles
		const dLat = deg2rad(lat2 - lat1);
		const dLon = deg2rad(lon2 - lon1);
		const a =
			Math.sin(dLat / 2) * Math.sin(dLat / 2) +
			Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
		const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
		return R * c;
	}

	function deg2rad(deg: number): number {
		return deg * (Math.PI / 180);
	}

	function updateMapCenterAndRadius(center: [number, number], currentRadiusMiles: number) {
		if (!mapInstance || !mapInstance.isStyleLoaded()) {
			console.warn('Map or style not loaded, skipping radius update.');
			return;
		}
		if (currentRadiusMiles <= 0) {
			console.warn('Radius (miles) is zero or negative, skipping radius drawing.');
			// Optionally remove existing circle if radius becomes invalid
			if (mapInstance.getLayer(radiusFillLayerId)) mapInstance.removeLayer(radiusFillLayerId);
			if (mapInstance.getLayer(radiusOutlineLayerId)) mapInstance.removeLayer(radiusOutlineLayerId);
			if (mapInstance.getSource(radiusGeoJSONSourceId))
				mapInstance.removeSource(radiusGeoJSONSourceId);
			return;
		}

		// Pass radius in miles directly to createGeoJSONCircle
		const circleGeoJSON = createGeoJSONCircle(center, currentRadiusMiles);

		if (
			!circleGeoJSON ||
			!circleGeoJSON.geometry ||
			!circleGeoJSON.geometry.coordinates ||
			circleGeoJSON.geometry.coordinates[0].length < 3
		) {
			console.error('Invalid Circle GeoJSON generated. Aborting radius draw.');
			return;
		}

		const source = mapInstance.getSource(radiusGeoJSONSourceId) as maplibreGl.GeoJSONSource;
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
					'fill-color': 'hsl(217.2 32.6% 17.5%)', // More visible fill
					'fill-opacity': 0.3 // Or set opacity in rgba
				}
			});

			mapInstance.addLayer({
				id: radiusOutlineLayerId,
				type: 'line',
				source: radiusGeoJSONSourceId,
				paint: {
					// 'line-color': 'rgba(30, 41, 59, 0.7)', // Darker, more opaque red
					'line-color': 'hsl(217.2 32.6% 17.5%)', // Darker, more opaque red
					'line-width': 3 // Thicker line
				}
			});
		}

		nearbyUsersList = [];

		m.userMarkers.forEach(({ user, marker }) => {
			const distanceMiles = getDistanceInMiles(center[1], center[0], user.lat, user.lng);
			const markerElement = marker.getElement();
			const svgPath = markerElement.querySelector('svg path'); // Default MapLibre marker uses a path

			if (distanceMiles <= currentRadiusMiles) {
				if (svgPath) (svgPath as SVGPathElement).style.fill = 'hsl(var(--primary))';
				nearbyUsersList.push(user);
			} else {
				if (svgPath) (svgPath as SVGPathElement).style.fill = 'hsl(var(--primary)/25%)'; // Default color for built-in marker
			}
		});

		onNearbyUsersUpdate(nearbyUsersList, m.userMarkers);
	}

	function createGeoJSONCircle(
		center: [number, number],
		radiusInMiles: number, // Changed parameter name
		points: number = 64
	): GeoJSON.Feature<GeoJSON.Polygon> {
		if (radiusInMiles <= 0) {
			console.warn('Radius for GeoJSON circle (in miles) is zero or negative.');
			return {
				// Return an empty polygon or handle as error
				type: 'Feature',
				geometry: { type: 'Polygon', coordinates: [[]] },
				properties: {}
			};
		}
		const coords = {
			latitude: center[1],
			longitude: center[0]
		};

		const ret: [number, number][] = [];
		const dLat = radiusInMiles / 68.703;
		const dLon = radiusInMiles / (69.171 * Math.cos(deg2rad(coords.latitude)));

		for (let i = 0; i < points; i++) {
			const theta = (i / points) * (2 * Math.PI);
			// x and y are degree offsets
			const xOffset = dLon * Math.cos(theta);
			const yOffset = dLat * Math.sin(theta);
			ret.push([coords.longitude + xOffset, coords.latitude + yOffset]);
		}
		ret.push(ret[0]); // Close the polygon

		const geojsonFeature: GeoJSON.Feature<GeoJSON.Polygon> = {
			type: 'Feature',
			geometry: {
				type: 'Polygon',
				coordinates: [ret] // GeoJSON Polygon coordinates are an array of rings
			},
			properties: {} // Add properties if needed
		};
		return geojsonFeature;
	}
</script>

<div class="h-full w-full" bind:this={mapContainer}></div>

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
