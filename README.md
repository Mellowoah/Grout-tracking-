# Grout Tracker

Phone app for logging grout piles: pump strokes, depth marks, trucks, yardage, QC tests and the field-sheet form.

**Open it:** https://mellowoah.github.io/Grout-tracking-/

## Install on your phone
- **iPhone:** open the link in Safari → Share → **Add to Home Screen**
- **Android:** open the link in Chrome → ⋮ → **Install app**

Open it once with signal; after that it works with no connection. After an update, close and reopen the app once or twice to pick it up.

## How a pile runs
The page follows the pour. The step you are on stays open near the top. Finished steps, and steps you have not reached, collapse to one line. Tap a line to open it again. A skipped step (no sample, no mark, no batch time) is flagged in red and listed again at closeout. It never stops you.

1. **Pile setup**: pile #, wall, station, elev, length (next pile # fills in automatically). Scan or type a filled-in form from here.
2. **Truck arrival**: load defaults to 9 yd³; **Scan ticket** reads truck I.D., load, batch time, ticket #, mix. **+ Add a truck** keys in a truck afterwards; **First pile** moves a truck to the pile it really started on and re-works yardage.
3. **Pumping**: **Drill finish** starts the grout and the pump (grout runs about 7 min; finish fills in if missed). **Feed pump** hooks up a truck (carried-over first). The bottom bar stays on screen: big **+1**, **Undo**, **Mark depth** / **Missed mark**. A counter reading can still set the total. Strokes with no truck are flagged, not blocked.
4. **Sample / QC**: **Sample taken (−1.1 yd³)** records a sample and takes that volume off the truck (the amount is editable on the card and in Settings). If the 50 yd³ rule already took the sample off, the button says so and does not take it twice. **Not taken** leaves the volume on the truck and flags it. **QC test** is grout temp and the flow-cone stopwatch.
5. **Grout return / stages**, then **Grout finish** (stops pumping; reinforce start = grout finish, finish +15 min if missed).
6. **Closeout / review**: My count, contractor count / agreed total, and **strokes by depth** (still editable here). Anything still open is listed before export. **Next pile** is two taps and sits here, not next to +1. Open trucks carry their leftover to the next pile. 20 s undo.

## Yardage rules
- Pump output 0.86 ft³ per stroke (Settings, ft³/yd³ switch).
- Used per truck per pile = confirmed strokes × pump output (or typed). Each step is rounded to 0.001 yd³. Left for next = load − sample − used − waste. The working screen shows 2 decimals and the line adds up (10 − 4.15 − 2.20 − 0.50 = 3.15). The paper form still shows 3 decimals. Excel cells are those rounded numbers.
- One 1.1 yd³ sample for every 50 yd³ delivered that day: the first truck, then each truck whose load crosses the next 50 (Settings; per-truck override on the truck card).
- When strokes pass a truck's load, counting moves to the next truck; the first is tagged and you confirm it empty after the next pile starts. Trucks only close when you say so.
- 2-hour cutoff from batch time: warning only. A batch a few minutes after arrival is the same day. The batch is treated as yesterday only when its clock time is more than 12 hours after arrival (batched before midnight, arrived after).
- **Clear all** (two taps, in closeout) wipes the phone record and the backup copy, so a reload stays empty. Sheets already loaded from preload are not imported again.

## Forms and records
- **View paper form**: two piles side by side like the field sheet, Arrived / Used / Carry over box between them, Load / Used / Left rows per truck.
- **Other piles**: open any earlier pile to fix it, then Back to the latest.
- **Scan filled-in form**: with an Anthropic API key in Settings, Claude reads the handwritten sheet (both piles, margin stroke counts, middle box) and fills each pile after you review it. Without a key, the on-phone reader handles printed text only. **Type in a form** opens the same grid.
- Everything saves on every tap, with a backup copy on the phone. Use **Export Excel** / **Backup JSON** at the end of each shift; **Import file** loads a backup.

## Updating
After changing `index.html`, bump `VERSION` in `sw.js` so installed phones pick up the change. The ticket/form reader files live in `ocr/` (Tesseract.js, Apache-2.0).
