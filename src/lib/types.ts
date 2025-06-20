export interface User {
    id: number;
    firstName: string;
    lastName: string;
    state?: string;
    city?: string;
    zipCode?: number;
    lat: number;
    lng: number;
}