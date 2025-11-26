import type maplibreGl from 'maplibre-gl';
import * as turf from '@turf/turf';

// Layer/source IDs
const ISOCHRONE = {
	source: 'isochrone-source',
	fill: 'isochrone-fill-layer',
	outline: 'isochrone-outline-layer'
} as const;

const CIRCLE = {
	fill: 'radius-circle-fill-layer',
	outline: 'radius-circle-outline-layer'
} as const;

/** Remove layers and source from map if they exist */
function removeLayers(map: maplibreGl.Map, layers: string[], source: string) {
	layers.forEach((id) => map.getLayer(id) && map.removeLayer(id));
	map.getSource(source) && map.removeSource(source);
}

/** Set visibility for multiple layers */
function setLayersVisibility(map: maplibreGl.Map, layers: string[], visible: boolean) {
	const value = visible ? 'visible' : 'none';
	layers.forEach((id) => map.getLayer(id) && map.setLayoutProperty(id, 'visibility', value));
}

export function setCircleVisibility(map: maplibreGl.Map | undefined, visible: boolean) {
	if (!map) return;
	setLayersVisibility(map, [CIRCLE.fill, CIRCLE.outline], visible);
}

export function clearIsochrone(map: maplibreGl.Map | undefined): boolean {
	if (!map) return false;
	removeLayers(map, [ISOCHRONE.fill, ISOCHRONE.outline], ISOCHRONE.source);
	setCircleVisibility(map, true);
	return true;
}

export function renderIsochrone(
	map: maplibreGl.Map | undefined,
	geojsonData: GeoJSON.FeatureCollection,
	fitBoundsOptions?: { padding: number; duration: number }
) {
	if (!map) return;

	// Clear existing isochrone first
	removeLayers(map, [ISOCHRONE.fill, ISOCHRONE.outline], ISOCHRONE.source);

	// Hide circle, show isochrone
	setCircleVisibility(map, false);

	map.addSource(ISOCHRONE.source, { type: 'geojson', data: geojsonData });

	map.addLayer({
		id: ISOCHRONE.fill,
		type: 'fill',
		source: ISOCHRONE.source,
		paint: { 'fill-color': '#10b981', 'fill-opacity': 0.25 }
	});

	map.addLayer({
		id: ISOCHRONE.outline,
		type: 'line',
		source: ISOCHRONE.source,
		paint: { 'line-color': '#059669', 'line-width': 2, 'line-dasharray': [2, 2] }
	});

	// Fit bounds if data exists
	if (fitBoundsOptions && geojsonData.features?.length > 0) {
		const bbox = turf.bbox(geojsonData);
		map.fitBounds([bbox[0], bbox[1], bbox[2], bbox[3]], fitBoundsOptions);
	}
}

export async function fetchIsochrone(
	center: [number, number],
	minutes: number
): Promise<GeoJSON.FeatureCollection> {
	const response = await fetch('/authenticated/api/calculateIsochrone', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			locations: [[center[0], center[1]]],
			profile: 'driving-car',
			range: [minutes * 60],
			range_type: 'time'
		})
	});

	if (!response.ok) throw new Error('Failed to calculate isochrone');
	return response.json();
}

