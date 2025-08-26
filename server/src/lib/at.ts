export async function fetchATData(path: string): Promise<any> {
    try {
        const response = await fetch(`https://api.at.govt.nz/gtfs/v3/${path}`, {
            headers: {
                "Ocp-Apim-Subscription-Key": process.env.AT_API_KEY || ""
            }
        });
        return response.json();
    } catch (error) {
        console.error('Error fetching AT data:', error);
        throw error;
    }
}

export async function getStops(): Promise<Stop[]> {
    const data = await fetchATData("stops");
    return data.data.map((stop: any) => ({
        id: stop.attributes.stop_id,
        code: stop.attributes.stop_code,
        name: stop.attributes.stop_name,
        lat: stop.attributes.stop_lat,
        lon: stop.attributes.stop_lon,
        location_type: stop.attributes.location_type,
        wheelchair_boarding: stop.attributes.wheelchair_boarding
    }));
}

export type Stop = {
    id: string,
    code: string,
    name: string,
    lat: number,
    lon: number,
    location_type: number,
    wheelchair_boarding: number;
};

export async function getRoutes(): Promise<Route[]> {
    const data = await fetchATData("routes");
    return data.data.map((route: any) => ({
        id: route.attributes.route_id,
        shortName: route.attributes.route_short_name,
        longName: route.attributes.route_long_name,
        mode: route.attributes.route_type
    }));
}

export type Route = {
    id: string,
    agency: string,
    shortName: string,
    longName: string,
    type: number;
};

export async function getStopTrips(id: string, date: Date, hourRange: number): Promise<StopTrip[]> {
    const data = await fetchATData(`stops/${id}/stoptrips?filter[date]=${date.toISOString().split("T")[0]}&filter[start_hour]=${date.getHours() + 12}&filter%5Bhour_range%5D=${hourRange}`);
    const trips = data.data.map((trip: any) => ({
        arrivalTime: new Date(`${trip.attributes.service_date}T${trip.attributes.arrival_time}+12:00`),
        departureTime: new Date(`${trip.attributes.service_date}T${trip.attributes.departure_time}+12:00`),
        directionId: trip.attributes.direction_id,
        dropOffType: trip.attributes.drop_off_type,
        pickupType: trip.attributes.pickup_type,
        routeId: trip.attributes.route_id,
        serviceDate: new Date(trip.attributes.service_date),
        shapeId: trip.attributes.shape_id,
        stopHeadsign: trip.attributes.stop_headsign,
        stopId: trip.attributes.stop_id,
        stopSequence: trip.attributes.stop_sequence,
        tripHeadsign: trip.attributes.trip_headsign,
        tripId: trip.attributes.trip_id,
        tripStartTime: new Date(`${trip.attributes.service_date}T${trip.attributes.trip_start_time}+12:00`)
    }));
    return trips.filter((t: StopTrip) => t.departureTime >= date);
}

export type StopTrip = {
    arrivalTime: Date,
    departureTime: Date,
    directionId: number,
    dropOffType: number,
    pickupType: number,
    routeId: string,
    serviceDate: Date,
    shapeId: string,
    stopHeadsign: string,
    stopId: string,
    stopSequence: number,
    tripHeadsign: string,
    tripId: string,
    tripStartTime: Date;
};