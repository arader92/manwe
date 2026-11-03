# Manwë

Your family weather app: Forecast, Storm Lab (radar, NWS warnings, SPC outlook, hurricanes), Night Sky, Trip forecast and Alerts.
Free data: Open-Meteo (NOAA models), National Weather Service, Iowa Mesonet radar, SPC, NHC, NOAA SWPC, OSRM routes.

## Put it on your iPhone, iPad and Mac (free, about 10 minutes)
1. Create a free GitHub account, then a new public repository named `manwe`.
2. Click "Add file → Upload files" and drag in everything in this folder. Commit.
3. Settings → Pages → Source: "Deploy from a branch", Branch: `main`, folder `/ (root)`. Save.
4. After a minute your app is at `https://<your-username>.github.io/manwe/`.
5. iPhone/iPad: open that link in Safari → Share → Add to Home Screen. Open Manwë from the Home Screen, go to Alerts and turn on notifications.
6. Mac: open the link in Safari → File → Add to Dock.

## Updating
Upload the new files over the old ones. If the installed app looks stale, bump `SHELL` in `sw.js` (manwe-v6 → manwe-v7).
