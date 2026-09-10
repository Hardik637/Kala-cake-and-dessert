---
name: menu-manager
description: Sub-agent skill for managing boutique dessert items, categories, pricing, seasonal creations, and catalog synchronization.
---

# Menu Manager Sub-Agent Skill

Use this skill when adding, modifying, updating prices, or deleting items from the boutique pâtisserie menu.

## Responsibilities
1. **Catalog Integrity**: Ensure every item has an English name, price in ₹, category ID, appetizing description, and valid high-resolution image URL.
2. **Category Presets**:
   - ID 2: Cakes (`cakes`)
   - ID 3: Pastries (`pastries`)
   - ID 4: Tarts (`tarts`)
   - ID 5: Cookies (`cookies`)
   - ID 6: Brownies (`brownies`)
   - ID 7: Chocolates (`chocolates`)
   - ID 8: Seasonal (`seasonal`)
3. **Photo Presets**: Always prefer high-resolution curated photography for French entremets, tarts, and viennoiserie.
4. **Availability & Stock**: Never force the owner to manage raw inventory counts. Use the binary `available: 1` (Live on Website) vs `available: 0` (Hidden) state.

## Quick CLI Verification
To verify current products in the database:
```bash
node -e "const db = require('./server/db'); console.log(db.prepare('SELECT id, name, price, available FROM products').all());"
```
