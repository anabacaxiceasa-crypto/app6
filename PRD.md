# Product Requirements Document (PRD) - App6

## 1. Introduction
**App6** (formerly NikeFlow Sales Manager) is a high-performance, mobile-first sales and inventory management system designed for **A.M Abacaxi (Ceasa Paraíba)**. It features a premium, Nike-inspired dark aesthetic with glassmorphism effects, aimed at providing a fluid and engaging user experience for both administrators and salespeople.

## 2. Product Goals
-   **Efficiency**: Streamline the point-of-sale (POS) process to be fast and intuitive.
-   **Control**: Provide robust inventory and financial management, including "fiado" (credit) tracking.
-   **Experience**: Deliver a "WOW" factor with high-end UI/UX design.
-   **Mobility**: Function seamlessly as a PWA (Progressive Web App) and Android APK.

## 3. User Roles
-   **Admin Master**: Full access to all modules, including financial reports, user management, and sensitive settings.
-   **Seller (Vendedor)**: Restricted access, focused primarily on the Sales POS and basic customer lookup.

## 4. Functional Requirements

### 4.1. Authentication & Security
-   **Login**: Email and password authentication via Supabase Auth.
-   **Role-Based Access Control (RBAC)**: Strict separation of Admin and Seller capabilities.
-   **Session Management**: Auto-logout for security and maintenance mode enforcement.

### 4.2. Point of Sale (POS)
-   **Quick Cart**: Fast product addition/removal.
-   **Payment Methods**: Support for Cash, Credit Card, Debit Card, PIX, and "Fiado".
-   **Stock Check**: Real-time inventory validation during sale.

### 4.3. Inventory Management (Products)
-   **CRUD Operations**: Add, edit, delete products.
-   **Stock Tracking**: Automatic deduction upon sale; support for manual stock adjustments.
-   **AI Integration**: Gemini AI integration for editing and enhancing product images.

### 4.4. Financial Management
-   **Dashboard**: Real-time overview of sales, revenue, and daily performance.
-   **Expenses**: Tracking of operational costs.
-   **Credit Sales (Fiado)**: Dedicated module to track and settle customer debts.
-   **Damaged Goods**: Tracking of lost/spoiled inventory.

### 4.5. User Management & Settings
-   **Team Management**: Admin can add/remove users and assign roles.
-   **System Settings**: Toggle maintenance mode, update app name/branding.

## 5. Non-Functional Requirements
-   **Performance**: Optimized for fast load times and smooth 60fps animations.
-   **Reliability**: Offline-first capability (PWA) and robust error handling.
-   **Scalability**: Built on Supabase for scalable backend data.
-   **Design**: "Nike-inspired" dark theme, responsive layout, fluid transitions.

## 6. Technical Stack
-   **Frontend**: React 19, Vite, TypeScript.
-   **Styling**: Tailwind CSS (custom config), Lucide React (icons).
-   **Backend**: Supabase (PostgreSQL, Auth, Realtime).
-   **AI**: Google Gemini API.
-   **Mobile**: Capacitor (Android APK).
-   **Deployment**: Vercel.
