import type { Place, RouteGeoJson } from "../types";

export async function fetchMapboxRoute(
  places: Place[],
  token: string,
  profile = "walking",
): Promise<RouteGeoJson> {
  if (!token) {
    throw new Error("Missing Mapbox token.");
  }

  const coordinates = places.map((place) => `${place.lng},${place.lat}`).join(";");
  const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordinates}?geometries=geojson&overview=full&access_token=${encodeURIComponent(token)}`;

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Directions request failed with status ${response.status}.`);
  }

  const data = await response.json();
  const geometry = data?.routes?.[0]?.geometry;
  if (!geometry || geometry.type !== "LineString" || !Array.isArray(geometry.coordinates)) {
    throw new Error("No route geometry was returned.");
  }

  return {
    type: "Feature",
    geometry,
    properties: {},
  };
}
