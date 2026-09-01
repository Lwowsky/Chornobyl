# THE 1037 SIGNAL — v0.60

## v0.60 HUD & starter-set usability

- HP, Radiation, Energy, and Bag values are rendered inside the center of each meter at every supported viewport width.
- Tablet HUD sizing no longer forces horizontal overflow; the game shell and profile content remain centered.
- HP/Energy recovery text stays full-size when space allows and switches to the compact badge on narrower layouts.
- The Dytiatky Gatekeeper first-clear reward now includes an **Equip Full Set** action in Ukrainian, English, Russian, and Japanese.

## v0.59 balance (base used for this patch)

The v0.59 full-playthrough build introduced these balance changes:

- Mobile HP and energy meters keep their values readable at 320 px; recovery is shown as a compact badge with the full localized text available as a tooltip.
- Expedition boss difficulty has a smoother curve at levels 3–6, 8, and 10. Maximum `+25` equipment remains supported but is no longer required for ordinary progression.
- Every expedition now awards money: first clears give the full reward and repeats give 55%.
- Backpack upgrade prices were reduced by roughly 21% overall while material requirements remain unchanged.
- Existing saves remain compatible.

## Languages

- English is the default and fallback language.
- On the first visit, the game uses the browser/device language when it is English, Ukrainian, Russian, or Japanese.
- Unsupported browser languages fall back to English.
- A language selected in Settings is saved on the device and takes priority on later visits.
- All four locales contain the same 2,213 keys and matching placeholders.

## Run locally

Open the project through any local web server. For example:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000/`.

## Save data

Game progress is stored in the browser. Use Settings → Heroes & Saves → Export Saves before clearing browser data or moving to another device.
