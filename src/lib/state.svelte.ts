import type { User } from "./types";
import type { Marker } from 'maplibre-gl';

interface M {
	users: User[];
	nearbyUsers: User[];
	userMarkers: Record<number, { user: User; marker: Marker }>; // Keyed by user.id for O(1) lookup
	circleCenter: [number, number] | [];
}

export const m = $state<M>({ users: [], nearbyUsers: [], userMarkers: {}, circleCenter: [] })