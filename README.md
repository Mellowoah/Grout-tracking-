# Grout Tracker

Phone app for counting pump strokes, depth marks, trucks and QC readings while grouting a pile.

**Open it:** https://mellowoah.github.io/Grout-tracking-/

## Install on your phone
- **iPhone:** open the link in Safari → Share → **Add to Home Screen**
- **Android:** open the link in Chrome → ⋮ → **Install app**

Open it once with signal; after that it works with no connection. Records stay on the phone; use **Export Excel** or **Backup JSON** at the end of each shift.

## Ticket scanning
On a truck card tap **Scan ticket** and take or pick a photo of the delivery ticket. The phone reads it (no data leaves the phone) and fills in truck I.D., load yd³, batch time, ticket #, mix and sample # for you to check before saving. The reader files live in `ocr/` (Tesseract.js, Apache-2.0) and download the first time you scan, so do the first scan with signal.

## Updating
After changing `index.html`, bump `VERSION` in `sw.js` (e.g. `grout-v1` → `grout-v2`) so installed phones pick up the change.
