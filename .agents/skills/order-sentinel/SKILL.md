---
name: order-sentinel
description: Sub-agent skill for validating customer order workflows, UPI/Card/COD payments, fulfillment toggles, and milestone increments.
---

# Order Sentinel Sub-Agent Skill

Use this skill to audit, test, and troubleshoot customer ordering, delivery calculation, and order status transitions.

## Key Rules & Workflow
1. **Fulfillment**:
   - `DELIVERY`: Requires phone, full address, and applies default delivery fee (`₹50`).
   - `PICKUP`: Delivery fee is `₹0`. Customer boutique pickup address is shown.
2. **Order Lifecycle**:
   - `NEW` → `PREPARING` → `READY` → `DELIVERED`
3. **Milestone Integration**:
   - When marked `DELIVERED`, if `milestone_credited == 0`, increment customer completed orders by 1.
   - If status changes away from `DELIVERED`, **NEVER** automatically decrement completed orders. Reversal is admin-only with an explicit audit log reason.

## Quick CLI Verification
To inspect recent orders and milestone credit status:
```bash
node -e "const db = require('./server/db'); console.log(db.prepare('SELECT id, order_number, total_amount, status, milestone_credited FROM orders ORDER BY id DESC LIMIT 5').all());"
```
