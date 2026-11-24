SIMPLE BUDGET - FREE IPHONE WEB APP
===================================

What is included
----------------
- 50/30/20 monthly dashboard for Needs, Wants, and dynamically calculated Savings left.
  Savings left = expected monthly income minus counted Needs and Wants spending;
  it updates immediately with added, edited, or deleted expenses. It does not
  subtract the grey utility forecasts until those expenses are recorded.
- Custom expense categories: Food, Gas, Entertainment, Girlfriend, Utilities.
- Separate, adjustable Needs and Wants monthly budgets for each custom category.
  Use 'Copy last month' to import allocations from the previous calendar month;
  new months start with blank category allocations (existing ones are preserved).
- Category totals (expand to view transactions) for the selected month.
- Recurring utility estimates (under Needs), shown in grey. Edit defaults or
  override a single month. The Needs dashboard bar shows recorded Needs in blue,
  plus unspent utility estimates in grey. When a counted Utilities expense is
  recorded, that amount replaces part of the grey forecast to avoid double
  counting. Only recorded expenses reduce calculated savings.
  All actual Utilities entries are categorized as Needs.
- Quick entry and editing of expenses only; older savings-transfer records are preserved.
- Credit card payment checkbox on expenses. These transactions remain in history
  but are EXCLUDED from Needs, Wants, category totals, and calculated Savings
  unless you enable "Add credit card payments" for that month. New months
  always default to excluding card payments. Existing untagged transactions
  keep counting as before.
- Any old savings transfer records remain in history and do not change
  calculated Savings left (to avoid reducing savings twice).
- Monthly income, expenses, budgets and totals.
- JSON backup/restore and a CSV transaction download, now including card-payment
  tagging and whether each payment was counted.

How to put it on your iPhone for free (GitHub Pages)
---------------------------------------------------
1. Unzip simple-budget-iphone-app-v5.zip on your computer.
2. Sign into github.com (free account).
3. Create a PUBLIC repository, for example "simple-budget".
4. Upload the extracted files directly to the repository's
   top level. The repository root needs index.html, app.js, styles.css,
   manifest.webmanifest, service-worker.js, and both PNG icons.
5. Go to your repository Settings > Pages.
6. Under Build and deployment, select "Deploy from a branch", select your
   main branch and / (root), then Save.
7. GitHub will show a public site URL in the Pages section when published.
8. On your iPhone, open that URL in Safari. Tap Share > Add to Home Screen,
   enable "Open as Web App" if shown, then tap Add.

Important privacy information
-----------------------------
The application files are publicly hosted, but your spending entries are NOT
committed to GitHub. They are automatically saved in your own browser/device storage after each
completed entry, edit, income change, budget change, or utility change. Closing
and reopening the app does not clear them. There is no cloud synchronization
between devices. Deleting browser/site storage, removing the app, or restoring
the phone may lose saved data.
Periodically use the Settings gear > Download backup button and save the
JSON file to iCloud Drive or another safe location.

The app is not a bank connection or a bill-payment system; it's a manual tracker.
For offline support, visit the hosted app while connected to the internet at
least once to allow your device to cache its files.

You can open index.html on a computer to inspect the layout, but local file
storage behavior varies by browser. For reliable use, host it as above.

Updating an existing installation
---------------------------------
If you already uploaded an earlier version, replace the files in the SAME
GitHub repository (same URL) rather than creating another site. Your saved
budget data remains on your phone as long as you use the same installed app
and do not clear its storage. The updated app also moves any previously saved
Utilities expense entries from Wants to Needs automatically, and adds the new
credit-card toggle without changing any old expenses. Export a JSON
backup before making changes to your installed app.

VERSION 5 — EXPENSE DATES & MONTHLY CALENDAR
--------------------------------------------
• Every expense has an editable date; the default is the current day when saved.
• Tap Calendar above the dashboard to see each day of the selected month.
• Calendar totals include recorded Needs/Wants expenses, following the month's
  Add credit card payments toggle. Unpaid utility estimates are not expenses.
• Tap a calendar day to see transactions or add a dated expense.
• Editing the date to a different month moves the expense to that month.
• Older entries are assigned their original entry day when it matches their
  saved month; otherwise they are assigned the first day of that saved month.
• Your existing on-device data uses the same storage key; download a JSON
  backup before publishing any update.
• This update changes the service-worker cache version; fully close and reopen
  the installed app if the previous layout initially appears.

VERSION 6 — BUDGET PROGRESS + IPHONE INPUT SCALE
-----------------------------------------------
• Dashboard Needs and Wants show spent vs goal, percent spent, and remaining.
• The Needs bar still includes a grey forecast for unpaid expected utilities.
  Its remaining amount reserves both actual expenses and pending utility estimates.
• Expand Category totals to see spent, percentage, and remaining dollars for
  each budgeted Needs/Wants category. No-budget categories say No budget set.
• Over-budget amounts are highlighted red instead of negative money left.
• Budget allocation summary identifies the percentage allocated and the
  remaining allocation; allocations are not treated as spent.
• Form inputs and selects use a minimum font size of 16 pixels to prevent
  Safari's automatic zoom when tapping a field on iPhone. Standard pinch
  zoom accessibility remains available.
• All stored budget data remains in the same localStorage key and schema.
• Versioned JS/CSS URLs plus a refreshed service worker ease updates.
  Back up your data before uploading these files to the same GitHub repo.
