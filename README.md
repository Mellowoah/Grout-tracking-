# Grout Tracker

Phone app for logging grout piles: pump strokes, depth marks, trucks, yardage, QC tests and the field-sheet form.

**Open it:** https://mellowoah.github.io/Grout-tracking-/

## Install on your phone
- **iPhone:** open the link in Safari → Share → **Add to Home Screen**
- **Android:** open the link in Chrome → ⋮ → **Install app**

Open it once with signal; after that it works with no connection. After an update, close and reopen the app once or twice to pick it up.

## How a pile runs
1. **Pile setup**: pile #, wall, station, elev, length (next pile # fills in automatically).
2. **Drill start** when the drill goes down (never blocks anything). **Drill finish** starts the grout and the pump (grout runs about 7 min; finish fills in if missed).
3. **Truck arrival**: load defaults to 9 yd³; **Scan ticket** reads truck I.D., load, batch time, ticket #, mix. A truck that carries a sample (first truck, then every 50 yd³) shows **Sample due**: report Taken or Not taken. **+ Add a truck** keys in a truck afterwards; **First pile** moves a truck to the pile it really started on and re-works yardage.
4. **Grout start**: starts pumping and hooks up a truck (carried-over first).
5. Count strokes on your own counter. Afterwards type them into **strokes by depth** (per band) or **My count** (total). The contractor's count / agreed total still overrides; yardage is split across trucks in the order they fed.
6. **QC test**: grout temp and flow-cone stopwatch. **Sample taken** logs the sample.
7. **Grout return**, then **Grout finish** (stops pumping; reinforce start = grout finish, finish +15 min if missed).
8. **Closeout**: My count, contractor count / agreed total. If no band strokes are entered, the total is split over the depth bands using today's piles of the same length (else by footage), marked * on the form.
9. **Next pile ▸**: one tap, never blocked. Open trucks carry their leftover to the next pile. 20 s undo.

## Yardage rules
- Pump output 0.86 ft³ per stroke (Settings, ft³/yd³ switch).
- Used per truck per pile = confirmed strokes × pump output (or typed). Left for next = load − sample − used − waste, shown to 0.001; grout carried on to the next pile is taken down by 0.001 (e.g. 2.103 → 2.102), not on the pile where the truck is emptied.
- One 1.1 yd³ sample for every 50 yd³ delivered that day: the first truck, then each truck whose load crosses the next 50 (Settings; per-truck override on the truck card).
- When strokes pass a truck's load, counting moves to the next truck; the first is tagged and you confirm it empty after the next pile starts. Trucks only close when you say so.
- 2-hour cutoff from batch time: warning only.

## Forms and records
- **View paper form**: two piles side by side like the field sheet, Arrived / Used / Carry over box between them, Load / Used / Left rows per truck.
- **Other piles**: open any earlier pile to fix it, then Back to the latest.
- **Scan filled-in form**: with an Anthropic API key in Settings, Claude reads the handwritten sheet (both piles, margin stroke counts, middle box) and fills each pile after you review it. Without a key, the on-phone reader handles printed text only. **Type in a form** opens the same grid.
- Everything saves on every tap, with a backup copy on the phone. Use **Export Excel** / **Backup JSON** at the end of each shift; **Import file** loads a backup.

## Updating
After changing `index.html`, bump `VERSION` in `sw.js` so installed phones pick up the change. The ticket/form reader files live in `ocr/` (Tesseract.js, Apache-2.0).
