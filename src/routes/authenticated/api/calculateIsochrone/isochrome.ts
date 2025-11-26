// longitude/latitude
export async function calculateIsochrone(profile: 'driving-car' | 'walking', location: number[], range: number, range_type: "time" | "distance") {
    const response = await fetch('/api/calculateIsochrone', {
        method: 'POST',
        body: JSON.stringify({
            "profile": profile,
            "locations": [location],
            "range": [range],
            "range_type": range_type
        })
    });
    return await response.json();
}