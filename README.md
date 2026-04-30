curl -X POST "http://localhost:3000/api/payments/create" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "7WP1UFKe3LmXLvmaXxT9JXonj9877p6xgNh8JZeoPQMb",
    "network": "dev", if the network is dev or test, display an orange capsular "DEV" or "TEST" badge next to the name.
    "meta": {
      "name": "Zahlung 123",
      "description": "This is a test payment This is a test payment This is a test payment This is a test payment This is a test payment This is a test payment.",
      "redirect": { (optional)
        "finished": "https://…",
        "cancelled": "https://…"
      },
      "theme": { (optional, default value is what currently is implemented)
        "background-page": "#000000", general website background color
        "background-box": "#2d2d2d", bg color of the centered box
        "background-field": "#404040", bg color of the address/receipient field
        "status-waiting": "#565656", color of the little gray dot in the history
        "status-done": "#009921", color of the little green dot in the history
        "outline-box": "#a9a9a9", outline color of the centered box
        "outline-field": "#666666", outline color of the address field
        "text-primary": "#ffffff", basically all text, like title, subtitle, etc…
        "text-secondary": "#999999" the text which is currently slightly gray
      }
    },
    "amount": {
      "value": 0.3, ( previosly named "solana"), fetch the SOL to dollar price yourself, and display "$" anyways.
      "change: -0.2 ( price change in percentage, should display a nice -20% or +5% in red or green thin font ( same size), on the right next to the large price.) change should only be displayed, if "already paid" is currently hidden.
    }
  }'

  payments.ts vielleicht auch ein bischen. 650 zeilen …
anstelle von status-timeline vielleicht einfach timeline.tsx? also gerne single word namen inwiefern es klappt.

Ich habe in README.md noch sehr wichtige änderungen an der api beschrieben. schau dir das umbeding an, und implementiere es sauber.