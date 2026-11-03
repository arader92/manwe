// Manwë widget for Scriptable (free on the App Store)
// Home Screen: small, medium, large. Lock Screen: circle, rectangle, inline.
// Data: Open-Meteo (NOAA models) + National Weather Service alerts. No keys needed.

// ----- Your settings -----
const MANWE_URL = "https://arader92.github.io/manwe/"; // tap the widget to open Manwë
const USE_GPS = true;                                         // false = always use the place below
const HOME = { name: "Pelham", lat: 33.2857, lon: -86.81 };
const UNITS = "F";                                            // "F" or "C"
// --------------------------

const fm = FileManager.local();
const cachePath = fm.joinPath(fm.cacheDirectory(), "manwe-widget.json");
const family = config.widgetFamily || "medium";
const lock = family.startsWith("accessory");

const WMO = {0:"Clear",1:"Mostly clear",2:"Partly cloudy",3:"Cloudy",45:"Fog",48:"Freezing fog",51:"Light drizzle",53:"Drizzle",55:"Heavy drizzle",56:"Freezing drizzle",57:"Freezing drizzle",61:"Light rain",63:"Rain",65:"Heavy rain",66:"Freezing rain",67:"Freezing rain",71:"Light snow",73:"Snow",75:"Heavy snow",77:"Snow grains",80:"Showers",81:"Showers",82:"Heavy showers",85:"Snow showers",86:"Snow showers",95:"Thunderstorms",96:"Storms with hail",99:"Storms with hail"};
function kind(c){if(c<=1)return"clear";if(c===2)return"partly";if(c===3)return"cloudy";if(c===45||c===48)return"fog";if(c>=95)return"storm";if((c>=71&&c<=77)||c===85||c===86)return"snow";return"rain"}
function symbol(c,day){const k=kind(c);return({clear:day?"sun.max.fill":"moon.stars.fill",partly:day?"cloud.sun.fill":"cloud.moon.fill",cloudy:"cloud.fill",fog:"cloud.fog.fill",rain:c<60?"cloud.drizzle.fill":"cloud.rain.fill",storm:"cloud.bolt.rain.fill",snow:"cloud.snow.fill"})[k]}
const SKIES={clear1:["#1b5fae","#3a8ad6","#8fc3ef"],clear0:["#050b1c","#0c1a3a","#22305a"],partly1:["#25609f","#4a86c2","#9dbfdf"],partly0:["#08112a","#142449","#2b3b63"],cloudy1:["#3e5672","#5d7591","#8fa2b8"],cloudy0:["#0f1724","#1c2738","#334156"],rain1:["#223449","#36506b","#5c7690"],rain0:["#0a121e","#152234","#26364d"],storm1:["#1a1f33","#2e3450","#4d4f6d"],storm0:["#07080f","#141726","#2a2d45"],snow1:["#5c7896","#88a2bd","#c5d4e3"],snow0:["#141d2c","#24324a","#405068"],fog1:["#5a6b7f","#7d8ea1","#aab6c3"],fog0:["#121821","#212a36","#38434f"]};
const T = f => Math.round(UNITS === "C" ? (f - 32) * 5 / 9 : f);
const H = s => +s.slice(11, 13);
const hourLbl = s => { const h = H(s); return h === 0 ? "12a" : h < 12 ? h + "a" : h === 12 ? "12p" : (h - 12) + "p"; };
const DN = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const dow = s => new Date(s.slice(0, 10) + "T12:00:00Z").getUTCDay();

async function getPlace() {
  if (!USE_GPS) return HOME;
  try {
    Location.setAccuracyToThreeKilometers();
    const loc = await Location.current();
    let name = "Here";
    try { const g = await Location.reverseGeocode(loc.latitude, loc.longitude); name = (g[0] && (g[0].locality || g[0].subAdministrativeArea)) || name; } catch (e) {}
    return { name, lat: loc.latitude, lon: loc.longitude };
  } catch (e) { return HOME; }
}

async function load(p) {
  const url = "https://api.open-meteo.com/v1/forecast?latitude=" + p.lat.toFixed(4) + "&longitude=" + p.lon.toFixed(4) +
    "&current=temperature_2m,apparent_temperature,weather_code,is_day,wind_speed_10m" +
    "&minutely_15=precipitation&forecast_minutely_15=5" +
    "&hourly=temperature_2m,precipitation_probability,weather_code,is_day" +
    "&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max" +
    "&temperature_unit=fahrenheit&wind_speed_unit=mph&precipitation_unit=inch&timezone=auto&forecast_days=6";
  const wx = await new Request(url).loadJSON();
  let alerts = [];
  try {
    const r = new Request("https://api.weather.gov/alerts/active?point=" + p.lat.toFixed(4) + "," + p.lon.toFixed(4));
    r.headers = { "User-Agent": "Manwe family weather widget", "Accept": "application/geo+json" };
    const j = await r.loadJSON();
    alerts = (j.features || []).map(f => f.properties.event).filter(e => /Warning|Watch|Advisory/.test(e));
  } catch (e) {}
  return { wx, alerts, place: p, at: Date.now() };
}

function nextHour(wx) {
  const m = wx.minutely_15; if (!m) return null;
  const now = wx.current.time.slice(0, 16);
  let s = m.time.findIndex(t => t >= now); if (s < 0) s = 0;
  const slots = m.precipitation.slice(s, s + 5), wet = v => v >= 0.004;
  if (wet(slots[0])) { const e = slots.findIndex(v => !wet(v)); return e < 0 ? "Rain for the hour" : "Rain ending in ~" + (e * 15) + " min"; }
  const b = slots.findIndex(wet); return b < 0 ? null : "Rain in ~" + Math.max(5, b * 15) + " min";
}

function txt(stack, s, size, weight, color, opacity) {
  const t = stack.addText(String(s));
  t.font = weight === "bold" ? Font.boldSystemFont(size) : weight === "light" ? Font.lightSystemFont(size) : weight === "semibold" ? Font.semiboldSystemFont(size) : Font.systemFont(size);
  t.textColor = color || Color.white(); if (opacity != null) t.textOpacity = opacity; return t;
}
function sym(stack, name, size, color) {
  const sf = SFSymbol.named(name) || SFSymbol.named("cloud.fill");
  if (!color) sf.applyFont(Font.systemFont(size));
  const img = stack.addImage(sf.image); img.imageSize = new Size(size, size);
  if (color) img.tintColor = color; return img;
}

async function build() {
  let data;
  try { data = await load(await getPlace()); fm.writeString(cachePath, JSON.stringify(data)); }
  catch (e) { if (fm.fileExists(cachePath)) data = JSON.parse(fm.readString(cachePath)); else { const w = new ListWidget(); w.addText("Manwë can't reach the weather right now."); return w; } }

  const { wx, alerts, place } = data, c = wx.current;
  const di = Math.max(0, wx.daily.time.indexOf(c.time.slice(0, 10)));
  const hi = Math.max(0, wx.hourly.time.indexOf(c.time.slice(0, 13) + ":00"));
  const cond = WMO[c.weather_code] || "", nh = nextHour(wx);
  const warn = alerts.find(a => /Warning/.test(a)) || alerts.find(a => /Watch/.test(a)) || alerts[0];

  const w = new ListWidget();
  w.url = MANWE_URL;
  w.refreshAfterDate = new Date(Date.now() + 15 * 60 * 1000);

  // ---------- Lock Screen ----------
  if (family === "accessoryInline") {
    w.addText(`${T(c.temperature_2m)}° ${warn ? warn : nh || cond}`);
    return w;
  }
  if (family === "accessoryCircular") {
    w.addAccessoryWidgetBackground = true;
    const s = w.addStack(); s.layoutVertically(); s.centerAlignContent();
    const a = s.addStack(); a.addSpacer(); sym(a, warn ? "exclamationmark.triangle.fill" : symbol(c.weather_code, c.is_day), 18); a.addSpacer();
    const b = s.addStack(); b.addSpacer(); txt(b, T(c.temperature_2m) + "°", 18, "semibold"); b.addSpacer();
    return w;
  }
  if (family === "accessoryRectangular") {
    const top = w.addStack(); top.centerAlignContent();
    sym(top, warn ? "exclamationmark.triangle.fill" : symbol(c.weather_code, c.is_day), 14); top.addSpacer(4);
    txt(top, `${T(c.temperature_2m)}° ${cond}`, 14, "semibold");
    txt(w, warn ? warn : (nh || `Feels like ${T(c.apparent_temperature)}°`), 12, warn ? "semibold" : "regular");
    txt(w, `H ${T(wx.daily.temperature_2m_max[di])}°  L ${T(wx.daily.temperature_2m_min[di])}°`, 12, "regular", null, .8);
    return w;
  }

  // ---------- Home Screen ----------
  const sky = SKIES[kind(c.weather_code) + (c.is_day ? 1 : 0)] || SKIES.partly1;
  const g = new LinearGradient(); g.colors = sky.map(h => new Color(h)); g.locations = [0, .5, 1]; w.backgroundGradient = g;
  w.setPadding(14, 14, 12, 14);

  const head = w.addStack(); head.centerAlignContent();
  txt(head, place.name, 13, "semibold"); if (USE_GPS && place !== HOME) { head.addSpacer(3); sym(head, "location.fill", 9, Color.white()); }
  head.addSpacer();
  if (family !== "small") txt(head, "Manwë", 11, "semibold", null, .6);

  const row = w.addStack(); row.centerAlignContent();
  txt(row, T(c.temperature_2m) + "°", family === "small" ? 40 : 44, "light");
  row.addSpacer(); sym(row, symbol(c.weather_code, c.is_day), family === "small" ? 28 : 32);

  txt(w, cond, 13, "semibold");
  txt(w, `H ${T(wx.daily.temperature_2m_max[di])}°  L ${T(wx.daily.temperature_2m_min[di])}°`, 12, "regular", null, .8);

  if (warn) {
    w.addSpacer(4);
    const b = w.addStack(); b.backgroundColor = new Color(/Warning/.test(warn) ? "#b3141f" : "#8a5d00", .9); b.cornerRadius = 6; b.setPadding(3, 6, 3, 6); b.centerAlignContent();
    sym(b, "exclamationmark.triangle.fill", 10, Color.white()); b.addSpacer(4); txt(b, warn, 11, "semibold").lineLimit = 1;
  } else if (nh) { w.addSpacer(2); txt(w, nh, 12, "semibold", new Color("#bfe9ff")); }

  if (family === "medium" || family === "large") {
    w.addSpacer();
    const hr = w.addStack();
    for (let k = 1; k <= 6; k++) {
      const i = hi + k; if (i >= wx.hourly.time.length) break;
      const col = hr.addStack(); col.layoutVertically(); col.centerAlignContent();
      const a = col.addStack(); a.addSpacer(); txt(a, hourLbl(wx.hourly.time[i]), 11, "regular", null, .75); a.addSpacer();
      col.addSpacer(3);
      const b = col.addStack(); b.addSpacer(); sym(b, symbol(wx.hourly.weather_code[i], wx.hourly.is_day[i]), 18); b.addSpacer();
      col.addSpacer(3);
      const d = col.addStack(); d.addSpacer(); txt(d, T(wx.hourly.temperature_2m[i]) + "°", 13, "semibold"); d.addSpacer();
      const pp = wx.hourly.precipitation_probability[i];
      const e = col.addStack(); e.addSpacer(); txt(e, pp >= 20 ? pp + "%" : " ", 10, "semibold", new Color("#7fd3ff")); e.addSpacer();
      if (k < 6) hr.addSpacer();
    }
  }

  if (family === "large") {
    w.addSpacer(10);
    for (let k = 1; k <= 5; k++) {
      const i = di + k; if (i >= wx.daily.time.length) break;
      const r = w.addStack(); r.centerAlignContent();
      const n = r.addStack(); n.size = new Size(44, 0); txt(n, DN[dow(wx.daily.time[i])], 14, "semibold");
      sym(r, symbol(wx.daily.weather_code[i], 1), 18); r.addSpacer(6);
      const pp = wx.daily.precipitation_probability_max[i];
      const p = r.addStack(); p.size = new Size(38, 0); txt(p, pp >= 20 ? pp + "%" : "", 11, "semibold", new Color("#7fd3ff"));
      r.addSpacer();
      txt(r, T(wx.daily.temperature_2m_min[i]) + "°", 14, "regular", null, .7); r.addSpacer(10);
      txt(r, T(wx.daily.temperature_2m_max[i]) + "°", 14, "semibold");
      if (k < 5) w.addSpacer(5);
    }
  }
  return w;
}

const widget = await build();
if (config.runsInWidget || config.runsInAccessoryWidget) Script.setWidget(widget);
else await widget.presentMedium();
Script.complete();
