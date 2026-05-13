export interface User {
    id: number;
    firstName: string;
    lastName: string;
    title: string;
    state?: string;
    city?: string;
    zipCode?: number | string;
    lat: number;
    lng: number;
    /** LP Status from data */
    lp_status?: string;
    lpStatus?: string;
    /** Spreadsheet-style column name in JSON */
    'LP Status'?: string;
}