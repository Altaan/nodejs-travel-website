/* eslint-disable */

export const displayMap = (locations) => {
  mapboxgl.accessToken =
    "pk.eyJ1IjoidGhlZHVkZTk5IiwiYSI6ImNrZGU2dGxmNzJlOTcycHNjNWxnaXNkdjgifQ.YSwJZlZ22gLWYuOR75pZzQ";
  var map = new mapboxgl.Map({
    container: "map",
    style: "mapbox://styles/thedude99/ckde6yiju4suf1hl67qd4pbdi",
    scrollZoom: false,
  });

  const bounds = new mapboxgl.LngLatBounds();

  locations.forEach((loc) => {
    // Create marker
    const el = document.createElement("div");
    el.className = "marker";

    // Add marker
    new mapboxgl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(loc.coordinates)
      .addTo(map);

    // Add popup
    new mapboxgl.Popup({
      offset: 30,
    })
      .setLngLat(loc.coordinates)
      .setHTML(`<p>Day ${loc.day}: ${loc.description}</p>`)
      .addTo(map);

    // Extend the map bounds to include the current location
    bounds.extend(loc.coordinates);
  });

  map.fitBounds(bounds, {
    padding: {
      top: 200,
      bottom: 150,
      left: 100,
      right: 100,
    },
  });
};
