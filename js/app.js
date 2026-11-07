(() => {
  "use strict";

  const places = window.GBTB_PLACES;
  const categories = window.GBTB_CATEGORIES;
  const highlightKeys = window.GBTB_HIGHLIGHTS;
  const galleryKeys = window.GBTB_GALLERY;
  const placeCount = Object.keys(places).length;
  const MAP_CENTER = [1.2816, 103.8645];
  const MAP_ZOOM = 16;

  const $ = (id) => document.getElementById(id);
  const els = {
    panel: $("detailPanel"),
    image: $("detailImage"),
    tag: $("detailTag"),
    priceBadge: $("detailPriceBadge"),
    number: $("detailNumber"),
    title: $("detailTitle"),
    description: $("detailDescription"),
    hours: $("detailHours"),
    price: $("detailPrice"),
    priceTable: $("priceTable"),
    priceRows: $("priceRows"),
    link: $("detailLink"),
    search: $("placeSearch"),
    reset: $("resetMap"),
    toggleLayer: $("toggleLayer"),
    takeMeThere: $("takeMeThere"),
    shareLocationBtn: $("shareLocationBtn"),
    categoryChips: $("categoryChips"),
    mobileList: $("mobilePlaceList"),
    highlightCards: $("highlightCards"),
    offerTrack: $("offerTrack"),
    shareBtn: $("shareBtn"),
    shareModal: $("shareModal"),
    shareTitle: $("shareTitle"),
    shareModalText: $("shareModalText"),
    closeShare: $("closeShare"),
    shareUrl: $("shareUrl"),
    qrcode: $("qrcode"),
    copyUrl: $("copyUrl"),
    officialLinkBox: $("officialLinkBox"),
    officialShareLink: $("officialShareLink"),
    mapPositionBox: $("mapPositionBox"),
    detailCoords: $("detailCoords"),
    detailMapsLink: $("detailMapsLink"),
    shareCoords: $("shareCoords"),
    status: $("detailStatus"),
    searchEmpty: $("searchEmpty"),
  };

  // ---------- Opening status (Singapore time) ----------
  const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  function sgNow() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Singapore",
      weekday: "short",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (type) => parts.find((p) => p.type === type)?.value;
    return {
      day: Math.max(0, DAY_NAMES.indexOf(get("weekday"))),
      t: Number(get("hour")) + Number(get("minute")) / 60,
    };
  }

  function fmtHour(h) {
    const x = ((h % 24) + 24) % 24;
    const hh = Math.floor(x);
    const mm = Math.round((x - hh) * 60);
    const h12 = hh % 12 === 0 ? 12 : hh % 12;
    return `${h12}.${String(mm).padStart(2, "0")}${hh < 12 ? "am" : "pm"}`;
  }

  /** @returns {{open:boolean,text:string}|null} */
  function getStatus(place) {
    if (!place?.sched) return null;
    const { day, t } = sgNow();
    const today = place.sched[day];
    const yest = place.sched[(day + 6) % 7];

    if (yest && yest[1] > 24 && t < yest[1] - 24) {
      return { open: true, text: `Open now · closes ${fmtHour(yest[1])}` };
    }
    if (today && t >= today[0] && t < today[1]) {
      if (today[0] === 0 && today[1] === 24) return { open: true, text: "Open 24 hours" };
      return { open: true, text: `Open now · closes ${fmtHour(today[1])}` };
    }
    if (today && t < today[0]) return { open: false, text: `Closed · opens today ${fmtHour(today[0])}` };
    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      if (place.sched[d]) {
        const when = i === 1 ? "tomorrow" : DAY_NAMES[d];
        return { open: false, text: `Closed · opens ${when} ${fmtHour(place.sched[d][0])}` };
      }
    }
    return { open: false, text: "Closed" };
  }

  function statusHtml(place, cls = "status-pill") {
    const s = getStatus(place);
    return s ? `<span class="${cls} ${s.open ? "is-open" : "is-closed"}"><i></i>${s.text}</span>` : "";
  }

  function renderStatus() {
    if (!els.status) return;
    const place = activeKey ? places[activeKey] : null;
    const s = getStatus(place);
    if (!s) {
      els.status.hidden = true;
      return;
    }
    els.status.hidden = false;
    els.status.className = `status-pill ${s.open ? "is-open" : "is-closed"}`;
    els.status.innerHTML = `<i></i>${s.text}`;
  }

  function mapsUrl(place) {
    return `https://www.google.com/maps?q=${place.lat},${place.lng}`;
  }

  function formatCoords(place) {
    return `${place.lat.toFixed(5)}° N, ${place.lng.toFixed(5)}° E`;
  }

  function qrImageUrl(link) {
    return `https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=10&data=${encodeURIComponent(link)}`;
  }

  // True when the page is served from a real public address (not file:// or localhost)
  function isHostedPublicly() {
    if (!/^https?:$/.test(location.protocol)) return false;
    return !/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(location.hostname);
  }

  function shareTargetUrl(key) {
    const place = key ? places[key] : null;
    // Once published, QR codes and links open THIS site on the visitor's phone, at the same place.
    if (isHostedPublicly()) return localShareUrl(key);
    if (place?.officialMap) return place.officialMap;
    if (place) return mapsUrl(place);
    if (location.protocol !== "file:") return localShareUrl(key);
    return "https://www.gardensbythebay.com.sg/en/plan-your-visit/gardens-map.html";
  }

  let map, satelliteLayer, streetsLayer, hoverPopup;
  let usingSatellite = true;
  let activeKey = null;
  let activeCategory = "all";
  const markers = new Map();

  function pinIcon(place, active, dimmed) {
    return L.divIcon({
      className: `gbtb-pin${active ? " active" : ""}${dimmed ? " dimmed" : ""}`,
      html: `<div class="gbtb-pin-inner">${place.id}</div>`,
      iconSize: [36, 36],
      iconAnchor: [18, 18],
    });
  }

  function resolveKey(raw) {
    if (!raw) return null;
    const n = decodeURIComponent(raw).trim().toLowerCase().replace(/['’]/g, "");
    const c = n.replace(/\s+/g, "-");
    if (places[n]) return n;
    if (places[c]) return c;
    const aliases = {
      "flower dome": "flower",
      "cloud forest": "cloud",
      "floral fantasy": "floral",
      "ocbc skyway": "skyway",
      skyway: "skyway",
      "supertree observatory": "observatory",
      "supertree grove": "supertree",
      "children's garden": "children",
      "childrens garden": "children",
      "kingfisher lake": "lake",
      "dragonfly lake": "lake",
      planet: "planet",
      "bay east": "bayeast",
      "bay east garden": "bayeast",
      "chinese garden": "heritage",
      "heritage gardens": "heritage",
      "world of plants": "worldplants",
      "the canyon": "canyon",
      "kingfisher wetlands": "wetlands",
      "satay by the bay": "satay",
      "golden garden": "golden",
      "the calyx": "canopy",
      "the canopy": "canopy",
    };
    if (aliases[n]) return aliases[n];
    if (aliases[c]) return aliases[c];
    const hit = Object.entries(places).find(([, p]) => p.name.toLowerCase() === n);
    return hit ? hit[0] : null;
  }

  function localShareUrl(key) {
    const url = new URL(window.location.href);
    url.search = "";
    if (key) url.searchParams.set("location", key);
    return url.toString();
  }

  function refreshMarkers(q = "") {
    const query = q.trim().toLowerCase();
    Object.entries(places).forEach(([key, place]) => {
      const marker = markers.get(key);
      if (!marker) return;
      const catOk = activeCategory === "all" || place.category === activeCategory;
      const textOk =
        !query ||
        place.name.toLowerCase().includes(query) ||
        place.tag.toLowerCase().includes(query);
      const visible = catOk && textOk;
      marker.setIcon(pinIcon(place, key === activeKey, !visible));
      marker.setOpacity(visible ? 1 : 0.25);
    });
  }

  function renderPrices(place) {
    if (!els.priceTable || !els.priceRows) return;
    if (!place.priceRows?.length) {
      els.priceTable.hidden = true;
      els.priceRows.innerHTML = "";
      return;
    }
    els.priceTable.hidden = false;
    els.priceRows.innerHTML = place.priceRows
      .map((r) => `<div class="price-row"><span>${r.label}</span><strong>${r.value}</strong></div>`)
      .join("");
  }

  function showHover(key) {
    const place = places[key];
    if (!place || !map) return;
    if (hoverPopup) map.closePopup(hoverPopup);
    hoverPopup = L.popup({
      className: "hover-photo-popup",
      closeButton: false,
      offset: [0, -18],
      autoPan: false,
      maxWidth: 250,
    })
      .setLatLng([place.lat, place.lng])
      .setContent(
        `<div class="hover-photo-card">
          <img src="${place.image}" alt="${place.name}" />
          <div class="body">
            <div class="tag">${place.tag}</div>
            <strong>${place.name}</strong>
            <div class="price">${place.price}</div>
            <div class="hours">${place.hours}</div>
            ${statusHtml(place, "status-pill mini")}
            <div class="coords"><span>MAP POSITION</span>${formatCoords(place)}</div>
          </div>
        </div>`
      )
      .openOn(map);
  }

  function selectPlace(key, opts = {}) {
    const place = places[key];
    if (!place) return;
    activeKey = key;
    els.panel?.classList.add("is-updating");

    if (els.image) {
      els.image.src = place.image;
      els.image.alt = place.name;
    }
    if (els.tag) els.tag.textContent = place.tag;
    if (els.priceBadge) els.priceBadge.textContent = place.price;
    if (els.number) els.number.textContent = `GARDEN GUIDE · ${place.id} / ${String(placeCount).padStart(2, "0")}`;
    if (els.title) els.title.textContent = place.name;
    if (els.description) els.description.textContent = place.desc;
    if (els.hours) els.hours.textContent = place.hours;
    if (els.price) els.price.textContent = place.price;
    if (els.mapPositionBox) els.mapPositionBox.hidden = false;
    if (els.detailCoords) els.detailCoords.textContent = formatCoords(place);
    if (els.detailMapsLink) {
      els.detailMapsLink.href = mapsUrl(place);
      els.detailMapsLink.textContent = "Open in Google Maps ↗";
    }
    if (els.link) {
      els.link.href = place.officialMap || place.url;
      els.link.textContent = "View on official Gardens Map ↗";
    }
    renderPrices(place);
    renderStatus();

    document.querySelectorAll(".mobile-place-list button").forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.place === key);
    });

    refreshMarkers(els.search?.value || "");
    if (opts.showHover !== false) showHover(key);
    if (opts.fly && map) map.flyTo([place.lat, place.lng], Math.max(map.getZoom(), 17), { duration: 0.75 });

    const url = new URL(window.location.href);
    url.searchParams.set("location", key);
    history.replaceState({}, "", url);
    setTimeout(() => els.panel?.classList.remove("is-updating"), 280);
  }

  function resetGuide() {
    activeKey = null;
    renderStatus();
    if (els.searchEmpty) els.searchEmpty.hidden = true;
    if (hoverPopup && map) map.closePopup(hoverPopup);
    if (els.image) {
      els.image.src = places.supertree.image;
      els.image.alt = "Supertree Grove";
    }
    if (els.tag) els.tag.textContent = "START EXPLORING";
    if (els.priceBadge) els.priceBadge.textContent = "Hover a pin for prices";
    if (els.number) els.number.textContent = `GARDEN GUIDE · 00 / ${String(placeCount).padStart(2, "0")}`;
    if (els.title) els.title.textContent = "A world of wonder awaits.";
    if (els.description) {
      els.description.textContent =
        "Hover or tap any numbered marker for a real photograph, hours and prices. Scroll up to see the illustrated Bay South visitor map.";
    }
    if (els.hours) els.hours.textContent = "Varies by location";
    if (els.price) els.price.textContent = "Explore free spaces & ticketed attractions";
    if (els.priceTable) els.priceTable.hidden = true;
    if (els.priceRows) els.priceRows.innerHTML = "";
    if (els.mapPositionBox) els.mapPositionBox.hidden = true;
    if (els.link) {
      els.link.href = "https://www.gardensbythebay.com.sg/en/plan-your-visit/gardens-map.html";
      els.link.textContent = "View on official Gardens Map ↗";
    }
    document.querySelectorAll(".mobile-place-list button").forEach((b) => b.classList.remove("active"));
    if (els.search) els.search.value = "";
    refreshMarkers("");
    if (map) map.flyTo(MAP_CENTER, MAP_ZOOM, { duration: 0.7 });
    const url = new URL(window.location.href);
    url.searchParams.delete("location");
    history.replaceState({}, "", url);
  }

  function initMap() {
    map = L.map("leafletMap", { center: MAP_CENTER, zoom: MAP_ZOOM, minZoom: 14, maxZoom: 19 });
    satelliteLayer = L.tileLayer(
      "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
      { attribution: "Tiles © Esri", maxZoom: 19 }
    );
    streetsLayer = L.tileLayer(
      "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png",
      { attribution: "&copy; OpenStreetMap &copy; CARTO", maxZoom: 19, subdomains: "abcd" }
    );
    satelliteLayer.addTo(map);

    Object.entries(places).forEach(([key, place]) => {
      const marker = L.marker([place.lat, place.lng], {
        icon: pinIcon(place, false, false),
        title: place.name,
        riseOnHover: true,
      });
      marker.on("mouseover", () => selectPlace(key));
      marker.on("click", () => selectPlace(key, { fly: true }));
      marker.addTo(map);
      markers.set(key, marker);
    });

    // Bounds cover Bay South and Bay East Garden (north of the bay)
    map.setMaxBounds(L.latLngBounds([1.2755, 103.8585], [1.2975, 103.874]).pad(0.2));
  }

  function buildChips() {
    if (!els.categoryChips) return;
    els.categoryChips.innerHTML = categories
      .map(
        (c) =>
          `<button type="button" class="chip ${activeCategory === c.id ? "active" : ""}" data-category="${c.id}">${c.label}</button>`
      )
      .join("");
  }

  function buildMobile() {
    if (!els.mobileList) return;
    els.mobileList.innerHTML = "";
    Object.entries(places).forEach(([key, place]) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.dataset.place = key;
      btn.textContent = `${place.id}  ${place.name}`;
      btn.addEventListener("click", () => selectPlace(key, { fly: true }));
      els.mobileList.appendChild(btn);
    });
  }

  function buildHighlights() {
    if (!els.highlightCards) return;
    els.highlightCards.innerHTML = "";
    highlightKeys.forEach(([key, title, copy]) => {
      const place = places[key];
      const col = document.createElement("div");
      col.className = "col-12 col-sm-6 col-lg-3";
      col.innerHTML = `<button type="button" class="highlight-card"><div class="hl-media"><img src="${place.image}" alt="${title}" loading="lazy" /><div class="hl-reveal"><p>${place.desc}</p><span>⏱ ${place.hours}</span><span>📍 ${formatCoords(place)}</span></div></div><div class="card-content"><small>${place.tag}</small><h3>${title}</h3><p>${copy}</p><span class="card-link">${place.price} · Explore ↗</span></div></button>`;
      col.querySelector("button").addEventListener("click", () => {
        selectPlace(key, { fly: true });
        $("explore").scrollIntoView({ behavior: "smooth" });
      });
      els.highlightCards.appendChild(col);
    });
  }

  function buildOffers() {
    if (!els.offerTrack) return;
    els.offerTrack.innerHTML = galleryKeys
      .map((key) => {
        const p = places[key];
        return `<button type="button" class="offer-card" data-place="${key}"><div class="offer-media"><img src="${p.image}" alt="${p.name}" loading="lazy" /><div class="offer-reveal"><p>${p.desc}</p><span>📍 ${formatCoords(p)}</span></div></div><div class="offer-copy"><strong>${p.name}</strong>${statusHtml(p, "status-pill mini on-dark") || `<span>⏱ ${p.hours}</span>`}<em>${p.price}</em></div></button>`;
      })
      .join("");
    els.offerTrack.querySelectorAll("[data-place]").forEach((btn) => {
      btn.addEventListener("click", () => {
        selectPlace(btn.dataset.place, { fly: true });
        $("explore").scrollIntoView({ behavior: "smooth" });
      });
    });
  }

  function openShare(key = activeKey) {
    const place = key ? places[key] : null;
    const targetUrl = shareTargetUrl(key);

    if (els.shareTitle) els.shareTitle.textContent = place ? `Share ${place.name}` : "Share this map";
    if (els.shareModalText) {
      els.shareModalText.textContent = place
        ? `Scan the QR code to open “${place.name}” on your phone — map position ${formatCoords(place)}.`
        : "Scan the QR code or copy the link to open the Gardens Map on your phone.";
    }
    if (els.shareUrl) els.shareUrl.textContent = targetUrl;

    if (place && els.shareCoords) {
      els.shareCoords.hidden = false;
      els.shareCoords.textContent = `Map position: ${formatCoords(place)}`;
    } else if (els.shareCoords) {
      els.shareCoords.hidden = true;
    }

    if (els.qrcode) {
      els.qrcode.innerHTML = `<img src="${qrImageUrl(targetUrl)}" width="170" height="170" alt="QR code for ${place ? place.name : "Gardens Map"}" />`;
    }

    if (place?.officialMap && els.officialLinkBox && els.officialShareLink) {
      els.officialLinkBox.hidden = false;
      els.officialShareLink.href = place.officialMap;
      els.officialShareLink.textContent = place.officialMap;
    } else if (place && els.officialLinkBox && els.officialShareLink) {
      els.officialLinkBox.hidden = false;
      els.officialShareLink.href = mapsUrl(place);
      els.officialShareLink.textContent = mapsUrl(place);
    } else if (els.officialLinkBox) {
      els.officialLinkBox.hidden = true;
    }

    els.shareModal?.classList.add("show");
    els.shareModal?.setAttribute("aria-hidden", "false");
    els.closeShare?.focus();
  }

  function closeShare() {
    els.shareModal?.classList.remove("show");
    els.shareModal?.setAttribute("aria-hidden", "true");
  }

  function bind() {
    els.reset?.addEventListener("click", resetGuide);
    els.toggleLayer?.addEventListener("click", () => {
      if (usingSatellite) {
        map.removeLayer(satelliteLayer);
        streetsLayer.addTo(map);
      } else {
        map.removeLayer(streetsLayer);
        satelliteLayer.addTo(map);
      }
      usingSatellite = !usingSatellite;
    });

    els.categoryChips?.addEventListener("click", (e) => {
      const btn = e.target.closest("[data-category]");
      if (!btn) return;
      activeCategory = btn.dataset.category;
      buildChips();
      refreshMarkers(els.search?.value || "");
    });

    els.search?.addEventListener("input", (e) => {
      const q = e.target.value.toLowerCase().trim();
      refreshMarkers(q);
      if (els.searchEmpty) els.searchEmpty.hidden = true;
      if (!q) return;
      const found =
        resolveKey(q) ||
        Object.entries(places).find(([, p]) => p.name.toLowerCase().includes(q) || p.tag.toLowerCase().includes(q))?.[0];
      if (found) selectPlace(found, { fly: true });
      else if (els.searchEmpty) {
        els.searchEmpty.hidden = false;
        els.searchEmpty.textContent = `No places match “${e.target.value.trim()}”. Try “Flower Dome”, “Skyway” or “Starbucks”.`;
      }
    });

    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && els.shareModal?.classList.contains("show")) {
        closeShare();
        els.shareBtn?.focus();
      }
    });

    els.takeMeThere?.addEventListener("click", () => {
      if (!activeKey) return;
      const p = places[activeKey];
      map.flyTo([p.lat, p.lng], 18, { duration: 0.8 });
      showHover(activeKey);
    });

    els.shareLocationBtn?.addEventListener("click", () => openShare(activeKey));
    els.shareBtn?.addEventListener("click", () => openShare(activeKey));
    els.closeShare?.addEventListener("click", closeShare);
    els.shareModal?.addEventListener("click", (e) => {
      if (e.target === els.shareModal) closeShare();
    });

    els.copyUrl?.addEventListener("click", async () => {
      const text = shareTargetUrl(activeKey);
      try {
        await navigator.clipboard.writeText(text);
        els.copyUrl.textContent = "Copied!";
        setTimeout(() => {
          els.copyUrl.textContent = "Copy share link";
        }, 1600);
      } catch {
        els.copyUrl.textContent = "Copy unavailable";
      }
    });

    $("offerPrev")?.addEventListener("click", () => els.offerTrack?.scrollBy({ left: -280, behavior: "smooth" }));
    $("offerNext")?.addEventListener("click", () => els.offerTrack?.scrollBy({ left: 280, behavior: "smooth" }));
    window.addEventListener("resize", () => map?.invalidateSize());
  }

  function boot() {
    const key = resolveKey(new URLSearchParams(location.search).get("location"));
    if (key) setTimeout(() => selectPlace(key, { fly: true }), 400);
  }

  function init() {
    initMap();
    buildChips();
    buildMobile();
    buildHighlights();
    buildOffers();
    bind();
    boot();
    // keep "Open now" badges fresh without a reload
    setInterval(() => {
      renderStatus();
      els.offerTrack?.querySelectorAll("[data-place]").forEach((card) => {
        const pill = card.querySelector(".status-pill");
        if (pill) pill.outerHTML = statusHtml(places[card.dataset.place], "status-pill mini on-dark");
      });
    }, 60000);
    setTimeout(() => map.invalidateSize(), 250);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
