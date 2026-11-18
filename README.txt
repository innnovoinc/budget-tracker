SIMPLE BUDGET - FREE IPHONE WEB APP
===================================

What is included
----------------
- 50/30/20 monthly dashboard for Needs, Wants, and dynamically calculated Savings left.
  Savings left = expected monthly income minus counted Needs and Wants spending;
  it updates immediately with added, edited, or deleted expenses.
- Custom expense categories: Food, Gas, Entertainment, Girlfriend, Utilities.
- Separate, adjustable Needs and Wants monthly budgets for each custom category.
- Category totals (expand to view transactions) for the selected month.
- Recurring utility estimates (under Needs), shown in grey. Edit defaults or
  override a single month. Estimates count toward the planned Needs budget but
  are NOT counted as money spent until you enter a corresponding actual expense.
  All actual Utilities entries are categorized as Needs.
- Quick entry and editing of expenses and (optional) savings transfers.
- Credit card payment checkbox on expenses. These transactions remain in history
  but are EXCLUDED from Needs, Wants, category totals, and calculated Savings
  unless you enable "Count card payments in totals" for that month. New months
  always default to excluding card payments. Existing untagged transactions
  keep counting as before.
- Savings transfers are separate records and do not change calculated Savings left
  (to avoid reducing savings twice).
- Monthly income, expenses, budgets and totals.
- JSON backup/restore and a CSV transaction download, now including card-payment
  tagging and whether each payment was counted.

How to put it on your iPhone for free (GitHub Pages)
---------------------------------------------------
1. Unzip simple-budget-iphone-app.zip on your computer.
2. Sign into github.com (free account).
3. Create a PUBLIC repository, for example "simple-budget".
4. Upload ALL files INSIDE the simple-budget-app folder to the repository's
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
