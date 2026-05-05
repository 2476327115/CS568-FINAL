import { useEffect, useRef, useState } from "react";
import mapboxgl, { LngLatBounds } from "mapbox-gl";
import { TOKYO_BOUNDS, TOKYO_CENTER } from "../constants/mockData";
import { getDayTheme } from "../lib/dayThemes";
import { debugItineraryStage } from "../lib/itinerarySchedule";
import type { DayRoute, ItineraryStop, Place, Step } from "../types";

interface MapViewProps {
  step: Step;
  selectedPlaces: Place[];
  itineraryStops: ItineraryStop[];
  dayRoutes: DayRoute[];
  hasValidItinerary: boolean;
  hoveredPlaceId: string | null;
  focusedPlaceId: string | null;
  onMarkerHover: (placeId: string | null) => void;
  onMarkerClick: (placeId: string) => void;
}

function projectToPercent(place: Place) {
  const x = ((place.lng - TOKYO_BOUNDS.west) / (TOKYO_BOUNDS.east - TOKYO_BOUNDS.west)) * 100;
  const y = ((TOKYO_BOUNDS.north - place.lat) / (TOKYO_BOUNDS.north - TOKYO_BOUNDS.south)) * 100;
  return { x, y };
}

function markerPopup(place: Place, stop?: ItineraryStop) {
  if (!stop) {
    return {
      title: place.name,
      subtitle: `${place.type} · ${place.area}`,
      reasons: place.availability,
    };
  }

  return {
    title: place.name,
    subtitle: `${stop.dayIndex ? `Day ${stop.dayIndex} · ` : ""}Stop ${stop.order} · ${stop.start}–${stop.end}`,
    reasons: stop.summaryReasons,
  };
}

function popupImageMarkup(place: Place) {
  if (place.imageUrl) {
    return `<img src="${place.imageUrl}" alt="${place.name}" style="display:block;width:100%;height:112px;object-fit:cover;border-radius:18px;box-shadow:inset 0 1px 0 rgba(255,255,255,0.3);" />`;
  }

  return `<div style="display:flex;align-items:flex-end;height:112px;padding:12px;border-radius:18px;background-image:${place.imageGradient};font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;color:white;">${place.imageLabel}</div>`;
}

function getDayRouteSourceId(dayIndex: number) {
  return `route-day-${dayIndex}`;
}

function getDayRouteLayerId(dayIndex: number) {
  return `route-day-${dayIndex}-line`;
}

function hexToRgba(hex: string, alpha: number) {
  const normalized = hex.replace("#", "");
  const value = normalized.length === 3
    ? normalized
        .split("")
        .map((char) => char + char)
        .join("")
    : normalized;

  const red = Number.parseInt(value.slice(0, 2), 16);
  const green = Number.parseInt(value.slice(2, 4), 16);
  const blue = Number.parseInt(value.slice(4, 6), 16);

  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

function clearDayRoutes(map: mapboxgl.Map) {
  const style = map.getStyle();
  const layerIds = style.layers?.map((layer) => layer.id) ?? [];
  const sourceIds = Object.keys(style.sources ?? {});

  layerIds
    .filter((id) => id.startsWith("route-day-"))
    .forEach((id) => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
    });

  sourceIds
    .filter((id) => id.startsWith("route-day-"))
    .forEach((id) => {
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    });
}

function syncDayRoutes(map: mapboxgl.Map, dayRoutes: DayRoute[]) {
  const activeSourceIds = new Set<string>();
  const activeLayerIds = new Set<string>();

  dayRoutes.forEach(({ dayIndex, routeGeoJson }) => {
    const sourceId = getDayRouteSourceId(dayIndex);
    const layerId = getDayRouteLayerId(dayIndex);
    const theme = getDayTheme(dayIndex);
    activeSourceIds.add(sourceId);
    activeLayerIds.add(layerId);

    if (map.getSource(sourceId)) {
      (map.getSource(sourceId) as mapboxgl.GeoJSONSource).setData(routeGeoJson);
    } else {
      map.addSource(sourceId, { type: "geojson", data: routeGeoJson });
    }

    if (!map.getLayer(layerId)) {
      map.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        paint: {
          "line-color": theme.mainColor,
          "line-width": 5,
          "line-opacity": 0.9,
        },
      });
    }
  });

  const style = map.getStyle();
  const sourceIds = Object.keys(style.sources ?? {});
  const layerIds = style.layers?.map((layer) => layer.id) ?? [];

  layerIds
    .filter((id) => id.startsWith("route-day-") && !activeLayerIds.has(id))
    .forEach((id) => {
      if (map.getLayer(id)) {
        map.removeLayer(id);
      }
    });

  sourceIds
    .filter((id) => id.startsWith("route-day-") && !activeSourceIds.has(id))
    .forEach((id) => {
      if (map.getSource(id)) {
        map.removeSource(id);
      }
    });
}

function MockTokyoMap({
  step,
  selectedPlaces,
  itineraryStops,
  dayRoutes,
  hasValidItinerary,
  hoveredPlaceId,
  focusedPlaceId,
  onMarkerHover,
  onMarkerClick,
}: MapViewProps) {
  const popupPlace =
    selectedPlaces.find((place) => place.id === hoveredPlaceId) ??
    selectedPlaces.find((place) => place.id === focusedPlaceId) ??
    null;

  const popupStop = itineraryStops.find((stop) => stop.placeId === popupPlace?.id);

  return (
    <div className="relative h-[48vh] overflow-hidden rounded-[32px] border border-white/70 bg-[#dae8f8] shadow-card lg:h-full">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.75),transparent_24%),radial-gradient(circle_at_80%_15%,rgba(255,237,213,0.78),transparent_25%),linear-gradient(135deg,#dce9f7_0%,#c5daf2_42%,#f2f7ff_100%)]" />
      <div className="absolute inset-0 opacity-60">
        <div className="absolute left-[8%] top-[22%] h-px w-[26%] rotate-12 bg-white/80" />
        <div className="absolute right-[12%] top-[16%] h-px w-[30%] -rotate-6 bg-white/70" />
        <div className="absolute left-[18%] top-[48%] h-px w-[42%] -rotate-12 bg-white/80" />
        <div className="absolute right-[14%] top-[64%] h-px w-[34%] rotate-[18deg] bg-white/75" />
        <div className="absolute left-[36%] top-[8%] h-[84%] w-px rotate-6 bg-white/40" />
      </div>

      <div className="absolute inset-x-0 top-0 flex items-center justify-between px-6 py-5">
        <div>
          <div className="rounded-full bg-white/80 px-3 py-1 text-xs font-bold uppercase tracking-[0.24em] text-harbor">
            Tokyo map
          </div>
          <div className="mt-2 text-sm font-medium text-slate-700">
            {step === "result" ? "Numbered route markers and explanation popups" : "Selected places stay visible while you plan"}
          </div>
        </div>
        <div className="rounded-2xl border border-white/70 bg-white/80 px-4 py-2 text-xs leading-5 text-slate-600">
          Mapbox-ready mock surface
          <br />
          Live basemap activates when `VITE_MAPBOX_TOKEN` is available.
        </div>
      </div>

      <div className="absolute inset-0">
        {step === "result"
          ? dayRoutes.map(({ dayIndex, routeGeoJson }) => {
              const theme = getDayTheme(dayIndex);

              return (
                <svg key={dayIndex} className="absolute inset-0 h-full w-full">
                  <polyline
                    fill="none"
                    stroke={theme.mainColor}
                    strokeDasharray="0"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="6"
                    opacity="0.9"
                    points={routeGeoJson.geometry.coordinates
                      .map(([lng, lat]) => {
                        const point = projectToPercent({
                          id: "route-point",
                          name: "Route point",
                          type: "",
                          area: "",
                          description: "",
                          availability: [],
                          lat,
                          lng,
                          imageLabel: "",
                          imageGradient: "",
                        });
                        return `${point.x},${point.y}`;
                      })
                      .join(" ")}
                  />
                </svg>
              );
            })
          : null}

        {selectedPlaces.map((place) => {
          const stop = itineraryStops.find((item) => item.placeId === place.id);
          const point = projectToPercent(place);
          const isResult = step === "result" && hasValidItinerary && stop;
          const active = hoveredPlaceId === place.id || focusedPlaceId === place.id;
          const theme = getDayTheme(stop?.dayIndex);

          return (
            <button
              key={place.id}
              type="button"
              onMouseEnter={() => onMarkerHover(place.id)}
              onMouseLeave={() => onMarkerHover(null)}
              onClick={() => onMarkerClick(place.id)}
              className={`absolute flex -translate-x-1/2 -translate-y-full items-center justify-center transition focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-harbor/20 ${
                active ? "z-20 scale-[1.18]" : ""
              }`}
              style={{ left: `${point.x}%`, top: `${point.y}%` }}
              aria-label={place.name}
            >
              {isResult ? (
                <span
                  className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-white text-sm font-bold text-white shadow-floating"
                  style={{
                    backgroundColor: theme.mainColor,
                    boxShadow: active
                      ? `0 0 0 8px ${hexToRgba(theme.mainColor, 0.24)}, 0 18px 36px rgba(15,23,42,0.24)`
                      : undefined,
                  }}
                >
                  {stop.order}
                </span>
              ) : (
                <span
                  className="flex h-5 w-5 rounded-full border-4 border-white shadow-floating"
                  style={{
                    backgroundColor: theme.mainColor,
                    boxShadow: active
                      ? `0 0 0 8px ${hexToRgba(theme.mainColor, 0.24)}, 0 18px 36px rgba(15,23,42,0.24)`
                      : undefined,
                  }}
                />
              )}
            </button>
          );
        })}

        {popupPlace ? (
          <div
            className="absolute z-10 w-64 rounded-[24px] border border-white/80 bg-white/95 p-4 shadow-floating"
            style={{
              left: `${Math.min(Math.max(projectToPercent(popupPlace).x + 2, 8), 72)}%`,
              top: `${Math.min(Math.max(projectToPercent(popupPlace).y + 4, 12), 70)}%`,
            }}
          >
            <div className="mb-3 overflow-hidden rounded-[18px]">
              {popupPlace.imageUrl ? (
                <img
                  src={popupPlace.imageUrl}
                  alt={popupPlace.name}
                  loading="lazy"
                  className="h-28 w-full rounded-[18px] object-cover"
                />
              ) : (
                <div
                  className="flex h-28 items-end rounded-[18px] p-3 text-[11px] font-bold uppercase tracking-[0.18em] text-white"
                  style={{ backgroundImage: popupPlace.imageGradient }}
                >
                  {popupPlace.imageLabel}
                </div>
              )}
            </div>
            <div className="text-sm font-semibold text-ink">{markerPopup(popupPlace, popupStop).title}</div>
            <div className="mt-1 text-sm text-slate-500">{markerPopup(popupPlace, popupStop).subtitle}</div>
            <div className="mt-3 text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
              Why recommended
            </div>
            <div className="mt-2 space-y-1.5 text-sm leading-6 text-slate-600">
              {markerPopup(popupPlace, popupStop).reasons.map((reason) => (
                <div key={reason}>• {reason}</div>
              ))}
            </div>
            <button
              type="button"
              onClick={() => onMarkerClick(popupPlace.id)}
              className="mt-3 rounded-full bg-slate-100 px-3 py-1.5 text-sm font-semibold text-harbor"
            >
              View details
            </button>
          </div>
        ) : null}
      </div>

      {step === "planning" ? (
        <div className="absolute inset-0 bg-white/45 backdrop-blur-[2px]" />
      ) : null}
    </div>
  );
}

function LiveMapboxMap({
  step,
  selectedPlaces,
  itineraryStops,
  dayRoutes,
  hasValidItinerary,
  hoveredPlaceId,
  focusedPlaceId,
  onMarkerHover,
  onMarkerClick,
}: MapViewProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [loaded, setLoaded] = useState(false);
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  useEffect(() => {
    if (!containerRef.current || mapRef.current) {
      return;
    }

    mapboxgl.accessToken = token;
    const map = new mapboxgl.Map({
      container: containerRef.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [TOKYO_CENTER.lng, TOKYO_CENTER.lat],
      zoom: 11.6,
      pitch: 28,
      bearing: -12,
      attributionControl: false,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("load", () => setLoaded(true));
    mapRef.current = map;

    return () => {
      markersRef.current.forEach((marker) => marker.remove());
      map.remove();
      mapRef.current = null;
      setLoaded(false);
    };
  }, [token]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !loaded) {
      return;
    }

    if (step === "result" && hasValidItinerary) {
      const placesById = Object.fromEntries(selectedPlaces.map((place) => [place.id, place])) as Record<string, Place>;
      debugItineraryStage("8. Before rendering numbered markers", itineraryStops, placesById);
      if (dayRoutes.length > 0) {
        debugItineraryStage("9. Before route line generation", itineraryStops, placesById, {
          dayRouteCount: dayRoutes.length,
          coordinateCount: dayRoutes.reduce((count, dayRoute) => count + dayRoute.routeGeoJson.geometry.coordinates.length, 0),
        });
      }
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    selectedPlaces.forEach((place) => {
      const stop = itineraryStops.find((item) => item.placeId === place.id);
      const isResult = step === "result" && hasValidItinerary && stop;
      const active = hoveredPlaceId === place.id || focusedPlaceId === place.id;
      const theme = getDayTheme(stop?.dayIndex);

      const markerElement = document.createElement("button");
      const markerInner = document.createElement("span");
      markerElement.type = "button";
      markerElement.style.background = "transparent";
      markerElement.style.border = "0";
      markerElement.style.padding = "0";
      markerElement.style.cursor = "pointer";

      markerInner.style.display = "flex";
      markerInner.style.alignItems = "center";
      markerInner.style.justifyContent = "center";
      markerInner.style.width = isResult ? "44px" : "18px";
      markerInner.style.height = isResult ? "44px" : "18px";
      markerInner.style.borderRadius = "999px";
      markerInner.style.border = "4px solid white";
      markerInner.style.background = theme.mainColor;
      markerInner.style.color = "white";
      markerInner.style.fontSize = "14px";
      markerInner.style.fontWeight = "800";
      markerInner.style.boxShadow = active
        ? `0 0 0 8px ${hexToRgba(theme.mainColor, 0.24)}, 0 18px 36px rgba(15,23,42,0.24)`
        : "0 12px 24px rgba(15,23,42,0.18)";
      markerInner.style.transform = active ? "scale(1.18)" : "scale(1)";
      markerInner.style.transformOrigin = "center";
      markerInner.style.transition = "transform 180ms ease, box-shadow 180ms ease";
      markerInner.innerText = isResult ? String(stop.order) : "";
      markerElement.onmouseenter = () => onMarkerHover(place.id);
      markerElement.onmouseleave = () => onMarkerHover(null);
      markerElement.onclick = () => onMarkerClick(place.id);
      markerElement.appendChild(markerInner);

      const popupData = markerPopup(place, stop);
      const popup = new mapboxgl.Popup({
        closeButton: false,
        offset: 16,
      }).setHTML(`
        <div style="padding: 16px; width: 240px; font-family: Manrope, sans-serif;">
          <div style="margin-bottom: 12px; overflow: hidden; border-radius: 18px;">
            ${popupImageMarkup(place)}
          </div>
          <div style="font-size: 14px; font-weight: 700; color: #10233f;">${popupData.title}</div>
          <div style="margin-top: 4px; font-size: 13px; color: #64748b;">${popupData.subtitle}</div>
          <div style="margin-top: 12px; font-size: 11px; font-weight: 700; letter-spacing: 0.18em; text-transform: uppercase; color: #64748b;">Why recommended</div>
          <div style="margin-top: 8px; font-size: 13px; line-height: 1.6; color: #475569;">${popupData.reasons
            .map((reason) => `• ${reason}`)
            .join("<br/>")}</div>
        </div>
      `);

      const marker = new mapboxgl.Marker({ element: markerElement })
        .setLngLat([place.lng, place.lat])
        .setPopup(popup)
        .addTo(map);

      markerElement.addEventListener("mouseenter", () => popup.addTo(map));
      markerElement.addEventListener("mouseleave", () => popup.remove());
      if (active) {
        popup.addTo(map);
      }

      markersRef.current.push(marker);
    });

    if (step === "result" && hasValidItinerary && dayRoutes.length > 0) {
      syncDayRoutes(map, dayRoutes);
    } else {
      clearDayRoutes(map);
    }

    if (selectedPlaces.length > 0) {
      const bounds = new LngLatBounds();
      selectedPlaces.forEach((place) => bounds.extend([place.lng, place.lat]));
      map.fitBounds(bounds, {
        padding: 80,
        duration: 900,
        maxZoom: step === "result" ? 12.7 : 12.1,
      });
    }
  }, [
    hasValidItinerary,
    selectedPlaces,
    itineraryStops,
    dayRoutes,
    step,
    loaded,
    hoveredPlaceId,
    focusedPlaceId,
    onMarkerHover,
    onMarkerClick,
  ]);

  return (
    <div className="relative h-[48vh] overflow-hidden rounded-[32px] border border-white/70 shadow-card lg:h-full">
      <div ref={containerRef} className="h-full w-full" />
      <div className="pointer-events-none absolute left-5 top-5 rounded-2xl border border-white/70 bg-white/85 px-4 py-2 text-xs leading-5 text-slate-600 shadow-card">
        Live Mapbox surface
        <br />
        Centered on Tokyo with mock route data
      </div>
      {step === "planning" ? <div className="absolute inset-0 bg-white/35 backdrop-blur-[2px]" /> : null}
    </div>
  );
}

export function MapView(props: MapViewProps) {
  const token = import.meta.env.VITE_MAPBOX_TOKEN;

  if (token) {
    return <LiveMapboxMap {...props} />;
  }

  return <MockTokyoMap {...props} />;
}
