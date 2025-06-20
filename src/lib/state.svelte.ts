import type { User } from "./types";
import type { Marker } from 'maplibre-gl';

interface M {
	users: User[];
	nearbyUsers: User[];
	userMarkers: { user: User; marker: Marker }[];
	circleCenter: [number, number] | [];
}

export const m = $state<M>({ users: [], nearbyUsers: [], userMarkers: [], circleCenter: [] })