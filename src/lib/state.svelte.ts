import type { User } from "./types";
import maplibreGl from 'maplibre-gl';

interface M {
	users: User[];
	userMarkers: { user: User; marker: maplibreGl.Marker }[];
	circleCenter: [number, number];
}

export const m = $state<M>({ users: [], userMarkers: [], circleCenter: [-75.272781, 40.147809] })

// Array.from({ length: 100 }, (_, i) => ({
// 	id: i + 1,
// 	name: `User ${i + 1}`,
// 	lat: 37.7 + Math.random() * 0.2,
// 	lng: -122.5 + Math.random() * 0.2
// }))
// export const userMarkers: { user: User; marker: maplibreGl.Marker }[] = $state([]);
// let userMarkers: { user: User; marker: maplibreGl.Marker }[] = $state([]);

