# Technical Specifications (specs.md) - App6

## 1. System Architecture
**App6** follows a client-server architecture using a **Single Page Application (SPA)** model.

*   **Frontend**: React 19 (Vite)
*   **Backend / Database**: Supabase (PostgreSQL) offered as a BaaS (Backend-as-a-Service).
*   **Authentication**: Supabase Auth (JWT-based).
*   **Hosting**: Vercel (Edge Network).
*   **Mobile Wrapper**: Capacitor (Android).

## 2. Directory Structure
```
app6/
├── src/
│   ├── components/       # Reusable UI components (Layout, inputs, modals)
│   ├── services/         # API services (Gemini AI integration)
│   ├── views/            # Page-level components (Dashboard, SalesPOS, Products)
│   ├── App.tsx           # Main application router and auth logic
│   ├── db.ts             # Supabase client and table definitions
│   └── index.css         # Global styles and Tailwind imports
├── android/              # Native Android project files (Capacitor)
├── dist/                 # Production build artifacts
├── public/               # Static assets
└── ...config files       # vite.config.ts, tailwind.config.js
```

## 3. Data Model (Supabase)
The application relies on the following key tables. Note: Internal table names are prefixed with `nikeflow_`.

| Table Name | Description | Key Columns |
| :--- | :--- | :--- |
| `nikeflow_users` | System users (Admin/Seller) | `id`, `email`, `role`, `name` |
| `nikeflow_products` | Inventory items | `id`, `name`, `price`, `stock`, `barcode` |
| `nikeflow_sales` | Sales transactions | `id`, `total`, `payment_method`, `created_at` |
| `nikeflow_customers` | Customer data | `id`, `name`, `phone`, `debt_balance` |
| `nikeflow_expenses` | Operational expenses | `id`, `description`, `amount`, `date` |

## 4. Key Components & Logic

### 4.1. Authentication (`App.tsx`)
-   Managed via `supabase.auth.onAuthStateChange`.
-   **Security**: Prevents unauthorized access by checking `userProfile.role` against the requested view.
-   **Auto-Redirect**: Sellers are forced to the POS view; Admins land on the Dashboard.

### 4.2. Point of Sale (`SalesPOS.tsx`)
-   **State Management**: Local state handles the current cart (`cart` array).
-   **Transaction**: Atomic updates are performed to prevent stock drift:
    1.  Create Sale record -> 2. Create Sale Items -> 3. Decrement Product Stock.

### 4.3. Offline Capability
-   The web app allows basic asset caching via Vite's PWA capabilities (if enabled).
-   Capacitor ensures the app bundle is loaded locally on Android, reducing initial load time.

## 5. Technology Dependencies
*   `react`, `react-dom`: UI Framework.
*   `lucide-react`: Iconography.
*   `tailwindcss`: Utility-first CSS framework.
*   `@supabase/supabase-js`: Database client.
*   `@google/genai`: AI image generation/editing features.
*   `@capacitor/core`, `@capacitor/android`: Mobile runtime.

## 6. Environment Variables
| Variable | Purpose |
| :--- | :--- |
| `VITE_SUPABASE_URL` | API Endpoint for Supabase project. |
| `VITE_SUPABASE_ANON_KEY` | Public API key for client-side requests. |
| `GEMINI_API_KEY` | Key for accessing Google Gemini AI services. |
