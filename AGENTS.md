# Boutique Pâtisserie — Sub-Agent Multi-Agent Architecture

This workspace is powered by an autonomous, role-specialized sub-agent ecosystem designed to keep the boutique pâtisserie website high-performing, elegant, bug-free, and easy for the store owner to manage.

---

## 1. Registered Sub-Agents & Specializations

| Sub-Agent Name | Role & Scope | Key Responsibilities | Primary Files |
| :--- | :--- | :--- | :--- |
| **`menu-manager-agent`** | Catalog & Menu Operations | Adding, updating prices, category management, curated image presets, and live visibility toggles. | `client/src/pages/admin/AdminProductsPage.jsx`<br>`server/controllers/productController.js` |
| **`order-sentinel-agent`** | Checkout & Order Pipeline | Verifying cart, checkout (Delivery vs Pickup), UPI/COD payments, and status pipeline (`NEW` → `PREPARING` → `READY` → `DELIVERED`). | `client/src/pages/CheckoutPage.jsx`<br>`server/controllers/orderController.js` |
| **`milestone-reward-agent`** | Customer Rewards Engine | Validating completed order counts (10/10 milestone), pearl tracker, rewards unlocks, and admin reversals. | `server/controllers/rewardController.js`<br>`client/src/pages/RewardsPage.jsx` |
| **`auth-sentinel-agent`** | Authentication & Security | Managing 6-digit OTP delivery, session tokens (customer & admin JWT), token refresh, and auto-logout on expiry. | `server/controllers/authController.js`<br>`client/src/context/AuthContext.jsx` |
| **`bug-fixer-agent`** | Automated Bug Resolution | Triage logs, run reproducible API & UI tests, diagnose SQLite schema errors, and apply immediate hotfixes. | `server/index.js`<br>`client/src/api/api.js` |

---

## 2. Automated Bug Prevention Runbook

Whenever an issue or task is reported, follow the standard multi-agent triage protocol:

1. **Log Inspection**: Inspect the Express server terminal logs (`[GET]`, `[POST]`, `[DELETE]`, status codes) to determine if a request failed at routing, middleware (e.g. 401 Unauthorized), controller logic (e.g. 400 Bad Request), or database constraints (e.g. 500 SQLite errors).
2. **Session Verification**: Verify that the caller's JWT token has not expired. The admin API requires an active `Bearer <token>` with `role: 'admin'`. If expired, trigger auto-logout and request re-login.
3. **Reproducible Test Script**: Before modifying code, execute a focused Node.js test script reproducing the exact failure scenario.
4. **Zero-Regression Verification**:
   - Run `npm.cmd --prefix client run build` to guarantee zero frontend syntax or Vite bundling errors.
   - Test server endpoints using automated integration tests.
   - Verify changes in both customer view and admin portal.

---

## 3. Sub-Agent Skills Reference

- **Menu Manager Skill**: `.agents/skills/menu-manager/SKILL.md`
- **Order Pipeline Skill**: `.agents/skills/order-sentinel/SKILL.md`
- **Bug Fixer & Diagnostic Skill**: `.agents/skills/bug-fixer/SKILL.md`
