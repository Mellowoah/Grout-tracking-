# Regression audit

Checked on 18 Nov 2026 against `main` at `60efc02` (Un-sample). Nothing here was merged.

The check was the full history of `main`, oldest commit to newest, plus the bodies of the merged pull requests and the open ones (#1, #5, #7, #8, #9, #10). Each commit’s message is the behavior it promised. Those one-line promises are listed at the end.

Drill times, pump times, truck switches, strokes, head strokes, My count, and the contractor count were read in the code and then run in a headless browser on `?profile=practice` with made-up piles only. Real field-day records and the separate Nov 17 profile were not opened. The other promises were checked by confirming the code that added them is still in the app.

## What had come apart

These are the places a later update undid an earlier one, or a same-day update did not do what it said. They are restored in this change. Later choices that were deliberate (remote shape, colors, Un-sample, the Truck times button coming off the remote, the grout-factor paragraphs staying off the paper sheet, no extra 0.001 taken off a carry) were left as they are.

### 1. The stroke total on the form was not the count the yards use

Promised, and still the rule for the yards: agreed total, otherwise the contractor count, otherwise My count (`confStrokes`, in place since the v100 audit, `9800503`).

On 17 Nov, `fb0c535` (“Display contractor controlling stroke count on inspection forms”) made the form’s TOTAL STROKES box look at the contractor count first, then the agreed total. The yards still look at the agreed total first.

Practice pile 101, made-up numbers: My count 90, contractor 80, agreed 70, phone counter 60, depth boxes 30 / 20 / 20 / 20. The form printed **80**. The yardage box USED was **2.230**, which is 70 strokes at 0.86 ft³. End of day already used 70. Three reports, two different stroke counts, and no line for My count or the head strokes. Commit `8035fbc` (16 Nov, “Keep paper output free of added explanations”) had also stopped printing the old “My count / contractor” line, so the form no longer showed the other counts at all.

The form total is now the same count the yards use. Under the pile, one line still shows the other numbers so they are not thrown away: `My count 90 · Contractor 80 · Agreed 70 · Head strokes 8`. The grout-factor paragraphs stay off the paper sheet, which is what `8035fbc` asked for. End of day prints the same line. A correction typed into TOTAL STROKES changes the count the yards are using (the agreed total when there is one, otherwise the contractor count, otherwise My count).

### 2. Carry-over vanished as soon as the next pile started

Promised by pull request #6, merged as `091d51b` on 18 Nov: ARRIVED is only the new truck loads. Leftover grout the pile starts with is CARRY OVER INTO, named by truck. CARRY OVER OUT is that same amount. An emptied truck carries nothing.

The code only listed a truck on the next pile after that truck had already pumped there (`usedOn` had to be greater than zero). On the practice run, pile 101 showed carry out **15.770** (7.726 on truck 1001 and 8.044 on truck 1002) while it was the last pile. Tapping Next pile cleared both carry cells. The trucks still held that grout (`carryIn` was saved). The center box then read arrived 18.000, used 2.230, and nothing left over, so 15.770 yd³ disappeared from the report.

Carry-over is shown again as soon as the next pile exists, before the first stroke on that pile. Both sides show **15.770**, truck 1001 then truck 1002. An emptied truck still carries nothing. ARRIVED is still only the new loads.

### 3. Corrections typed on the form did not land on the pile you were standing on

Promised the same morning by `e4e1d07` (“Connect editable form fields to source records”).

`formCellEdit` wrote through `pileRec`, which hands back a copy of the pile on screen. A change to the stroke total or to a depth box that did not exist yet was written on that copy and thrown away. Stage times sometimes stuck only because they sit on a shared inner object.

The time pattern in that same function was written so it looked for a backslash and the letter d, not for a number. “8:05 AM” was rejected. Drill, pump, arrival, and empty corrections from the form did not save.

Both are fixed. On the practice pile, changing the total to 77 saved 77 on the agreed total and the yards moved with it (2.453). Changing drill start to 8:05 AM saved 8:05. A depth box typed on a pile that had none yet saved as well.

### 4. Excel did not report the same strokes as the form

Since `7e25deb` (16 Nov, v95), the Excel column MyStrokes is the phone counter whenever counting is turned on. A typed My count was ignored. Exports correctly stay blank when counting is off and nothing was typed or tapped; that part is unchanged.

Typed depth strokes were on the form and not on the Excel depth rows. Head strokes were used in the grout check and were not on the Excel pile row.

Excel MyStrokes is now the typed My count when there is one, and otherwise the same rule as before (the counter, or a blank when the phone is not counting). A HeadStrokes column was added. Depth rows include strokes typed into the depth boxes. On the practice pile that is MyStrokes 90, HeadStrokes 8, contractor 80, agreed 70, depths 30 / 20 / 20 / 20.

### 5. The head-stroke setting said one thing and did another

`b341e13` (16 Nov) set head strokes to 0 when the box is blank, and the settings line said “Blank = 0.” `3bc35cc` (17 Nov) changed the math so a blank means 29, and left the sentence in place.

The grout check was subtracting 29 while the screen told you a blank means 0. The sentence now matches the math: leave it blank to use 29, type 0 when the count has no head strokes. Typing 0 still means 0.

### 6. The app still told you to open a remote button that was removed on purpose

`9ea1497` (18 Nov) removed the Truck times button from the remote. That was intentional, and the button is still gone. Truck times are still edited on the truck card, which is the other place `0f3c506` (v97) promised.

The “How it works” card and the add-truck screen still said “Remote → Truck times.” The screen behind that button (`ttOpen`) has no button left. Those two sentences now point at the truck card.

## What still lines up

Checked on the same practice piles, before and after the fixes:

- Drill start 8:00, drill finish 8:12, grout start 8:12, grout finish 8:40.
- Truck 1001 pumps 8:12 to 8:25. Truck 1002 pumps 8:25 to 8:40. The switch is the recorded truck-switch time, not a guessed minute. This is the rule from `0da64c0` and `ecb5c12`.
- Drill finish still starts grout at that same moment and turns the pump on. Grout finish still turns the pump off.
- A red “est.” time is still only a guess (reinforce start and finish, when those were not tapped).
- Depth boxes show the strokes that were typed (20, 20, 20, 30).
- Head strokes stay inside the deepest-band estimate and are not added on top of a band that was measured (`44e8649`).
- Waiting trucks are not put on the pump by themselves.
- Un-sample still asks before it removes a sample and puts the yards back.
- The stroke key is still the wide key at the bottom of the remote. Truck arrived is still the top-left key. The remote color wheel is still in the Colors button.
- “View pile form” and “View QC / truck form” open the same sheet. They have done that since the shortcuts were added (`4162734`). There was not a second form that got deleted.
- Pump On / Pump Off still do not fill Grout finish. The written guide already says that. Pull requests #5 and #7 would add it. They are not on `main`, so this is not something a later update erased.

The extra 0.001 that used to be taken off a carry (`0cc6447`) was removed on purpose by the v100 audit (`9800503`). The guide at the top of the repo still described the old step. That sentence now matches the app. The 0.001 step was not put back.

## Open pull requests

None of these are merged. This note is only about what would happen if they were.

- **#8** (Un-sample beside QC Sample) moves that button. It does not change drill, pump, or stroke math. It sets the saved copy to version 151, the same number this change uses. After one of them is merged, the next one should move to 152 so a phone picks up the later change.
- **#9** (trucks sent back, and trucks that left with waste) does not change the stroke total or the carry rule. It does edit the form, End day, and Excel, which this change also edits. Those two will need a careful look when they are put together. It also uses version 151.
- **#10** (forms refresh when truck or pump counts change) fixes some of the same reporting gaps: the copy of the current pile, and My count and head strokes on the reports. It also changes which strokes the yards follow when every depth box was typed. This change does not do that. Merging both will conflict, and both use version 151.
- **#7** (stamp grout times from the pump, and remote skins) was built on `main` from before the stroke key moved to the bottom and before Un-sample. Merging it as it stands would fight those later remote changes. Its saved copy is version 139, which is older than what phones are on now.
- **#5** is the earlier version of that same pump-stamp idea, on an older base.
- **#1** (12 Nov: cutoff, yardage rounding, pour layout) is from before the remote, the stroke rules, and the form work. Merging it would lay that old page over everything done since.

## Every update, oldest first

Each line is the behavior that commit promised. If it is not named under “What had come apart,” it is still in the app.

- 2026-11-12 — Initial commit
- 2026-11-12 — Add Grout Tracker offline app
- 2026-11-12 — Add GitHub Actions workflow for GitHub Pages deployment
- 2026-11-12 — Batch/arrival/empty times, per-pile yardage with waste or carry-forward, paper-form layout
- 2026-11-12 — Auto-fill missed stage times from field rules
- 2026-11-12 — Reinforce start = grout finish + 15 min (was: reinforce takes 15 min)
- 2026-11-12 — Reinforce starts at grout finish and takes 15 min (undo previous swap)
- 2026-11-12 — Scan delivery tickets; cutoff runs from arrival time
- 2026-11-12 — Cutoff back to 2 hours from batch time
- 2026-11-12 — Flow cone stopwatch and labelled grout temp on each QC test
- 2026-11-12 — 1.1 yd³ off every truck, contractor-confirmed strokes, automatic truck handoff
- 2026-11-12 — Pump calibration defaults to 0.86 ft³ per stroke, with ft³/yd³ switch
- 2026-11-12 — Auto next pile number; truck yd³ left in header, carried-in card and paper form
- 2026-11-12 — One-tap Next pile (tray + setup card) with 20 s undo; no confirm step
- 2026-11-12 — Next pile records each truck's usage on the finished pile
- 2026-11-12 — Paper forms run consecutively; trucks shared between piles show on both
- 2026-11-12 — Paper form: Load / Used this pile / Left for next rows per truck
- 2026-11-12 — Reopen any earlier pile to view/edit, then return; backup copy of records
- 2026-11-12 — Contractor count always drives usage, even with no own count
- 2026-11-12 — Default 9 yd³ load per truck (setting); blank loads backfilled
- 2026-11-12 — At cutoff, truck is emptied: leftover to waste, next truck takes over
- 2026-11-12 — Never auto-close trucks; tag for confirmation; strokes-left estimate
- 2026-11-12 — Scan or type in a filled-in paper form to fill the current pile
- 2026-11-12 — Form laid out like the field sheet; used and carry-over fill in everywhere
- 2026-11-12 — Read handwritten sheets with Claude; preload today's piles 42-45 once
- 2026-11-12 — Show every truck of the day: earlier trucks on the main screen with times and per-pile usage; truck times in pile list
- 2026-11-12 — Grout start starts pumping (feeds a truck if none); Grout finish stops pumping
- 2026-11-12 — README: current pile flow, yardage rules, forms and records
- 2026-11-12 — Samples: one 1.1 yd³ per 50 yd³ delivered (first truck, then each truck crossing the next 50)
- 2026-11-12 — Show yardage to 3 decimals like the field sheet (5.797 not 5.8)
- 2026-11-12 — Carry-over rule: grout carried to the next pile is taken down by 0.001
- 2026-11-12 — Counter readings replace +1 taps; yd³ per depth band at 0.86 ft³/stroke
- 2026-11-12 — My count at closeout; split total over depth bands when no depths marked
- 2026-11-12 — Strokes entered by hand afterwards; contractor count still drives yardage
- 2026-11-12 — README: strokes entered afterwards
- 2026-11-12 — Paper form unchanged: plain total strokes, depth rows show entered strokes only
- 2026-11-12 — Form total strokes: written total (182), not sum of bands
- 2026-11-12 — All forms button on the bottom bar and in the pile area; opens at the first pile
- 2026-11-12 — View all pile forms button at the top of the screen
- 2026-11-12 — Updates show on the next open: app page network-first (saved copy offline), reload when a new version takes over, check on resume
- 2026-11-12 — Email / Text pile forms: pictures through the share menu, or numbers as text
- 2026-11-12 — Trucks keyed in afterwards, first-pile picker, batch-time fix; drill finish starts grout; sample due reporting
- 2026-11-12 — Depth strokes auto-fill when not entered (app boxes, forms, texts); blanks split what's left of the total
- 2026-11-12 — Fill missing times from today's own data
- 2026-11-12 — Pile 45 was skipped: rename it to 46 once on phones (next pile 47)
- 2026-11-12 — Load piles 46-48 from today's sheets; fix truck/column matching
- 2026-11-12 — Cutoff warning names the truck by number when it has no I.D.
- 2026-11-12 — Remove pile 45 where it still shows; Delete pile button
- 2026-11-12 — Simpler main screen
- 2026-11-12 — Clearer status boxes: Feeding pump / Strokes / Pump on-off with trucks on site
- 2026-11-12 — + Scan a ticket: adds a truck and opens the camera in one tap (for tickets scanned after the fact)
- 2026-11-12 — Trucks belong to the day; the app places them on piles
- 2026-11-12 — Truck arrival = waiting on site; the strokes decide which truck a pile used
- 2026-11-12 — Clean start for new users: one-time sheet loads removed, How it works card, pile details open until a pile # is set
- 2026-11-12 — Problem reports: errors caught and logged, red banner, Report a problem with automatic checks
- 2026-11-12 — Problem reports can be opened as GitHub issues on the repo (label app-report)
- 2026-11-12 — ?profile=name keeps a separate set of data (clean test run on the same phone)
- 2026-11-12 — First truck arrived button at the top when no truck is on site
- 2026-11-12 — Pile steps dimmed (still usable) until a truck is on site
- 2026-11-12 — End day: close out trucks, save the day to Past days, start fresh
- 2026-11-12 — Today's piles: plan the day, auto-fill each pile, grout/truck estimate and missing-info check
- 2026-11-12 — Problems & delays: log stops (breakdowns, waiting, weather) and send trucks back
- 2026-11-12 — Depth lines screen: next line, expected counter, buzz before each line, auto-fill strokes when no reading
- 2026-11-12 — Fill missed truck arrivals from the gap between trucks; show all auto-filled values in red
- 2026-11-12 — Pouring view (truck, depth line, stop, finish on one screen) and grout factor check per band
- 2026-11-12 — Grout check without a diameter: compare each band with today's typical strokes per foot
- 2026-11-12 — Pouring view: feeding truck run-out countdown, buzz a minute before, switch prompt
- 2026-11-12 — Bring back the tap counter; one-hand pouring view; fix see-through screen after a buzz
- 2026-11-12 — Stop double-tap zoom while tapping strokes (iPhone)
- 2026-11-12 — Show new-truck yardage next to Arrived when grout was carried in
- 2026-11-12 — Undo as many steps as needed; Clear all can be undone
- 2026-11-12 — Show app version on the saved line so it's easy to tell an update loaded
- 2026-11-12 — Restore offline support: app opens with no signal, updates land on next open
- 2026-11-13 — Load today's sheets (piles 45, 49, 54, 55?, 55, 56) once, only on 11/13; yesterday's day saved to Past days first; 30 in diameter
- 2026-11-13 — Today's sheets corrected (piles 45, 49, 54, 55, 56, 57; pump counts, truck changes); replaces the earlier load on phones that already have it
- 2026-11-13 — Truck 5 (#2100) carried 5 yd³, not 9
- 2026-11-13 — Round top buttons: upload filled-in forms (several photos), type a form, all forms, voice commands; duplicate buttons removed
- 2026-11-14 — Remote mode: five-key remote screen (Bluetooth keypad works too); commands from a link for Siri Shortcuts
- 2026-11-14 — Remote: small End truck buttons under the keys (one per truck on site, feeding first), records the empty time; Undo
- 2026-11-16 — Pump mode: whole screen turns the pump on/off (red/gray, beep + buzz, 1.5 s double-tap guard, 10 s undo); PUMP key on the remote, keypad 5 and clicker B/F5; Siri 'pump on'/'pump off'; Settings: Count strokes on this phone (off = no counter or prompts, blanks not zeros); v95
- 2026-11-16 — v96 (not live): strokes-to-depth fixes - rate and typical rate leave out the bottom band/head, 115% below 5 ft and top-5-ft setting (1.00/1.05), grout head setting taken off the bottom band, strokes/ft column, pump-off time out of line timing; Remote: feeding truck line
- 2026-11-16 — v96: grout head strokes default 0 (hint shows 5 ft of head at the diameter)
- 2026-11-16 — v96: band box saves a typed value equal to the shown estimate
- 2026-11-16 — v96: voice/typed commands - iPhone results run when listening ends, no false 'Didn't catch that', Home Screen app message, Remote shows the result, refusals in red, spoken numbers, '15 strokes'/'passed line'/'line 20 at 45', truck N arrived, notes, start/stop pumping
- 2026-11-16 — v97: truck arrival/empty times editable (truck card + Remote > Truck times; blank clears, empty before arrival or bad time refused in red), add a truck by hand (next number, ID/yards/times optional, feeding option), no truck needed to start a pile; export no longer writes 1970 for a truck with no arrival
- 2026-11-16 — v98 (not live): main screen in two areas - Pile (steps, details, strokes by depth, closeout) then Trucks (one + Add truck N, one Truck arrived now, truck cards, pile yardage); removed duplicate truck buttons; Remote fits one screen portrait/landscape, keys help behind a button, no repeated truck yards; Truck times overlay with sticky close
- 2026-11-16 — v99 (not live): trucks go on the pile they were at - manual add waits on site until it feeds or empties; a truck that arrived before a pile's grout finish stays on that pile and carries on
- 2026-11-16 — v99: when the feeding truck is marked empty, the next truck in order starts feeding automatically (its strokes and yards go on this pile)
- 2026-11-16 — v100 (not live): targeted fixes from spec audit D1-D10 - no 0.001 carry step; only recorded samples deduct (old days keep old rule for unanswered reminders); contractor/agreed count reconciled in feeding order, not scaled; change history + first split saved; exact handoff boundary, eligible trucks only, held strokes when none; estimated totals marked; fixable line readings; Take sample, Left site time, End of day reason
- 2026-11-16 — v100: Take sample on the truck card's main buttons; old saved days keep no schema flag (legacy sample rule); form total marked * when estimated
- 2026-11-16 — v100: no separate QC test input - Take sample + Sample # on the truck card; the sample holds this pile's temp and flow cone (form SAMPLE # / GROUT TEMP / FLOW CONE TIME); voice 'sample taken' goes on the feeding truck; second tap needed for a 2nd sample on the same pile
- 2026-11-16 — End-of-day truck rebalance preview and missing-data checks (#3)
- 2026-11-16 — Archive Nov 16 dictated field records without altering app state
- 2026-11-16 — Scope field preload to dedicated profile to protect existing phone records
- 2026-11-16 — Preload Nov 16 piles into isolated tracker profile
- 2026-11-16 — Support truck arrival/departure in scoped field preload
- 2026-11-16 — Include four Nov 16 trucks in isolated tracker profile
- 2026-11-16 — Bump app version for Nov 16 field preload
- 2026-11-16 — Record confirmed 9 yd3 loads for all four Nov 16 trucks
- 2026-11-16 — Apply truck load quantities to existing profile
- 2026-11-16 — Update existing Nov 16 profile with four confirmed 9-yard loads
- 2026-11-16 — Prevent false zero yardage and carryover on imported pile forms (#4)
- 2026-11-16 — Correct paper form arrived, used, and carryover from sequential truck allocation; preserve imported day
- 2026-11-16 — Allow non-destructive timestamp completion for existing preloaded piles
- 2026-11-16 — Complete November 16 pile 58 and 59 grout stages in existing phone profile
- 2026-11-16 — Match reference field sheet: keep truck yardage in center summary, not extra form rows
- 2026-11-16 — Keep paper output free of added explanations and render saved/shared form text in black
- 2026-11-16 — Correct export-only estimated asterisk removal
- 2026-11-16 — Expose sample capture and sample number on all truck cards including earlier and unassigned trucks
- 2026-11-16 — Populate inspection form truck columns from recorded truck arrival and empty times when explicit pile links absent
- 2026-11-16 — Join explicit and time-matched trucks on inspection forms and force black text in exported images
- 2026-11-16 — Fix export-only asterisk stripping expression
- 2026-11-16 — Remove estimated red styling and asterisks from all inspection forms; keep red only in entry controls
- 2026-11-16 — Make stage controls phone-sized and add non-blocking missed-time flags with later correction
- 2026-11-17 — Assume 29 initial head strokes included in pile totals unless explicitly overridden
- 2026-11-17 — Add confirmed reset for accidental drill-start tap, preserving audit and allowing fresh start
- 2026-11-17 — Do not assign waiting trucks by arrival or automatically switch on estimated runout
- 2026-11-17 — Prevent automatic pump assignment to waiting trucks at grout start and truck runout
- 2026-11-17 — Exclude waiting trucks from carryover and prevent hydration from assigning them to piles
- 2026-11-17 — Auto-allocate next eligible truck at pump-stroke runout; timestamp estimated handoff and separate actual departure
- 2026-11-17 — Carry forward only grout-supplying trucks with remaining load; show current source and estimated strokes to switch
- 2026-11-17 — Show only grout-supplying trucks on pile forms and suppress false carry/empty labels
- 2026-11-17 — Display contractor controlling stroke count on inspection forms without overwriting original count
- 2026-11-17 — Show recorded final truck waste in center form box instead of misleading zero carryover
- 2026-11-17 — Add remote grout-return button with immediate timestamp and optional depth entry
- 2026-11-17 — Prefill isolated Nov 17 field profile with Piles 51/61, truck loads 9 and 5, and photographed times
- 2026-11-17 — Correct Nov 17 Pile 51/61 paper form yardage from verified loads and contractor strokes; preserve raw field entries
- 2026-11-17 — Reconcile Nov 17 truck handoff in stored profile; preserve inspector counts and prevent waiting truck from form
- 2026-11-17 — Apply one-time verified November 17 truck handoff reconciliation to isolated profile
- 2026-11-17 — Keep 29 head strokes inside deepest-band estimates, never double count or overwrite measured depth bands
- 2026-11-17 — Show confirmed waste for final truck; label unconfirmed balance as estimated remaining
- 2026-11-17 — Show final truck calculated leftover as WASTE without requiring confirmation
- 2026-11-17 — Correct Nov 17 reinforcement finish times to 15 minutes with audit log; preserve truck empty times
- 2026-11-17 — Apply one-time Nov 17 reinforcement duration correction to existing phone records
- 2026-11-17 — Show truck-specific pump start and finish; estimate missing handoff from allocated strokes
- 2026-11-17 — Visibly mark estimated truck pump handoff times on printable form
- 2026-11-17 — Show final-pile WASTE row in shared center yardage table
- 2026-11-17 — Remove invented 10:17 proportional pump handoff; show only recorded truck switch times
- 2026-11-17 — Correct Nov 17 pump handoff to 10:15/10:16 and retain exact event timestamps for future truck switches
- 2026-11-17 — Align Nov 17 Truck 625 finish and Truck 688 start at 10:16 AM
- 2026-11-18 — Add remote sample power button with truck selection and form shortcuts
- 2026-11-18 — Improve remote ergonomics with larger thumb targets and readable sample and form controls
- 2026-11-18 — Allow tap-to-edit paper form cells with separate correction audit trail
- 2026-11-18 — Connect editable form fields to source records, truck switches and recalculated ledger with audit trail
- 2026-11-18 — Show carry-over into a pile separately from new truck loads. (#6)
- 2026-11-18 — Add remote body color wheel in Settings with live preview and saved preference
- 2026-11-18 — Put remote color picker and button explanations in top-right remote menu
- 2026-11-18 — Make remote color picker discoverable with prominent Colors button in remote header
- 2026-11-18 — Expand remote shell and fit sample, forms and truck controls inside remote
- 2026-11-18 — Remove Truck times button from remote header
- 2026-11-18 — Move stroke counter to bottom of remote and add short audible click on taps
- 2026-11-18 — Unify remote button geometry, typography and spacing while retaining control hierarchy
- 2026-11-18 — Unify remote buttons to same dark color and finish with subtle pump-on warning outline
- 2026-11-18 — Reshape remote as handheld clicker and enforce uniform button color, type and finish
- 2026-11-18 — Constrain stroke button inside tapered remote shell on narrow iPhones
- 2026-11-18 — Move Truck arrived to first top-left remote button
- 2026-11-18 — Add Un-sample remote control with confirmation, sample yardage restoration and correction audit

Cache on this branch: grout-v151 (was grout-v150).
