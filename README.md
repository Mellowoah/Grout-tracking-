# Grout Tracker

Phone app for logging grout piles: pump strokes, depth marks, trucks, yardage, QC tests and the field-sheet form.

**Open it:** https://mellowoah.github.io/Grout-tracking-/

## Install on your phone
- **iPhone:** open the link in Safari → Share → **Add to Home Screen**
- **Android:** open the link in Chrome → ⋮ → **Install app**

Open it once with signal; after that it works with no connection. After an update, close and reopen the app once or twice to pick it up.

## Today's piles (plan the day)
- Open **Today's piles** at the top and type the day's pile numbers (`41-48, 52` works), with wall, length and diameter for all of them; fill station / elev per pile in the list.
- Each pile's details fill in when you get to it; **Next pile ▸** goes to the next pile on the list. Tap a pile # in the list to jump to it.
- **Ready for the day** shows footage, estimated grout (diameter, corrected by how today's finished piles ran) plus samples, about how many trucks, and what's missing (station, elevation, length, pump setting).
- At **End day**, piles on the list that weren't done stay on it for tomorrow.

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

## Pouring view and grout factor
- **Pouring view** (opens at Grout start) puts the pour on one screen: feeding truck with yd³ / strokes left, **Switch to truck #** / **Truck empty**, the next depth line with the buzz, **Problem / delay** and **Grout finish**.
- With the pile diameter (Pile details, or Today's piles) each band's grout is compared with the hole's theoretical volume. A band typed / read below the required factor (Settings, default 1.15×, confirm against your spec) buzzes, shows a red **UNDER** alert, and is flagged in strokes by depth, on the form and at End day. Auto-filled bands are shown but not flagged.
- A counter reading typed at a line also updates the app's stroke count, so truck yardage and hand-off follow along.

## Depth lines (buzz)
- Opens by itself at **Grout start** (or tap **Depth lines** under the pile steps). Shows the next line in big numbers, about where your counter should be (from 0 at grout start), and a countdown to when the line should come up.
- The phone buzzes (beeps and flashes on iPhone, which can't vibrate from a web app) 10 s before each line is expected, based on how fast today's piles came up and how this pile is going. The screen stays awake while it's open.
- Tap **Passed __ ft** at each line. Typing the counter reading is optional: lines left blank fill in by themselves (split by the time each band took, else the expected rate), shown in red (red * on the form). Typed contractor count or agreed total still overrides.

## Problems & delays
- **Problem / delay** (under the pile steps): **Stopped now** for a drill or pump breakdown, waiting on trucks, weather or other, with who caused it. It saves the time, strokes and depth band if grouting was under way, pauses the pump and shows a red **Back running** bar until work starts again. **It already happened** adds a stop and you type the times.
- Stops list on the pile (edit kind, cause, times, what was done), on the form, in the Excel export (**Problems_delays**) and at End day with total down minutes by cause.
- **Send a truck back** (wrong mix, past the cutoff, failed QC, not needed): for a truck that hasn't pumped. The load comes off every pile's yardage and the sample count but stays on the day's record (**Sent back today**, Undo). The red cutoff bar is tappable to send that truck back. A truck that already pumped uses **Leftover is waste**.

## Yardage rules
- Pump output 0.86 ft³ per stroke (Settings, ft³/yd³ switch).
- Used per truck per pile = confirmed strokes × pump output (or typed). Left for next = load − sample − used − waste, shown to 0.001; grout carried on to the next pile is taken down by 0.001 (e.g. 2.103 → 2.102), not on the pile where the truck is emptied.
- One 1.1 yd³ sample for every 50 yd³ delivered that day: the first truck, then each truck whose load crosses the next 50 (Settings; per-truck override on the truck card).
- When strokes pass a truck's load, counting moves to the next truck; the first is tagged and you confirm it empty after the next pile starts. Trucks only close when you say so.
- 2-hour cutoff from batch time: warning only.
- Missed truck arrival fills in from batch + today's average batch→arrival, else the truck before it + today's average gap between arrivals (never later than when the truck was first used).
- Anything filled in automatically shows in red in the app and as a red * on the forms; typing over it replaces it.

## Forms and records
- **View paper form**: two piles side by side like the field sheet, Arrived / Used / Carry over box between them, Load / Used / Left rows per truck.
- **Other piles**: open any earlier pile to fix it, then Back to the latest.
- **Scan filled-in form**: with an Anthropic API key in Settings, Claude reads the handwritten sheet (both piles, margin stroke counts, middle box) and fills each pile after you review it. Without a key, the on-phone reader handles printed text only. **Type in a form** opens the same grid.
- Everything saves on every tap, with a backup copy on the phone. Use **Export Excel** / **Backup JSON** at the end of each shift; **Import file** loads a backup.

## Updating
After changing `index.html`, bump `VERSION` in `sw.js` so installed phones pick up the change. The ticket/form reader files live in `ocr/` (Tesseract.js, Apache-2.0).
