# Inovexa Technologies Enterprise ERP & CRM System v2.0
## Specialized IT Hardware & Networking Operations Suite

Inovexa is a high-fidelity, enterprise-grade, all-in-one Enterprise Resource Planning (ERP) and Customer Relationship Management (CRM) platform tailored specifically for IT hardware, networking devices, cloud computing software, and advanced cybersecurity solutions distribution.

Built with **React**, **Vite**, **TypeScript**, and **Firebase (Auth & Firestore)**, the platform integrates seamless **local Sandbox Mode auto-bypass**, robust role-based access control (RBAC), automatic mock data seeding, automated low-stock warnings, multi-tier quotation/invoice lifecycles with visual PDF rendering, customer lifecycle CRM profiles, and immutable auditing.

---

## 🚀 Key Modules & System Architecture

### 1. Zero-Friction Local Sandbox / Offline Mode
* **Automatic Detection**: If Firebase Email/Password auth is restricted in your console, the login screen detects it and automatically activates **Local Sandbox Mode** on the fly.
* **Local Persistence Engine**: Intercepts Firestore CRUD write operations (`setDoc`, `addDoc`, `updateDoc`, `deleteDoc`) and redirects them to `localStorage` prefixes, ensuring the app runs perfectly with full CRUD features in any sandbox.
* **Automatic High-Fidelity Seeding**: Detects empty datasets and automatically seeds the offline storage with complex mock data representing real-world networking topologies and cloud inventory.
* **Google Sign-In Options**: Full pre-configured OAuth integration supporting standard corporate Google login protocols.

### 2. Multi-tier Customer CRM & Account Lifecycle
* **Status Phases**: Track prospects from **Lead** &rarr; **Contacted** &rarr; **Proposal** &rarr; **Active Customer**.
* **3-Tab Account Profile Drawer**:
  * **Contacts**: Manage technical personnel, emails, phone lines, and corporate addresses.
  * **Timeline**: Keep a record of calls, proposals sent, meetings, and notes.
  * **Accounting & Tags**: Track customer credit limits, billing terms (Net 30/60), and corporate segmentation tags.

### 3. Advanced IT Hardware & Software Inventory
* **SKU Generator**: Automates standard inventory SKU codes (e.g. `INV-HW-NODE-C4`).
* **Critical Stock Thresholds**: Continuous alerts and color-coded status badges (**In Stock**, **Low Stock**, **Out of Stock**).
* **Detailed Logistics**: Manage standard cost, retail margins, direct suppliers, physical warehouse shelves, item variants, and datasheet attachments.

### 4. Financial Billing, Invoices & Visual PDFs
* **Quotes & Invoices Workflow**: Convert accepted Quotations directly into active Sales Orders, and then compile them into Invoices.
* **Auto-Deductions**: Confirming or marking an invoice as paid automatically updates stock levels across inventory nodes in real-time.
* **Neumorphic PDF Viewer**: Generate beautifully formatted, high-fidelity corporate documents with visual billing templates ready for print or download.

### 5. Specialized RMA, Serial & Warranty Tracking
* **Serial Lookup Scanning**: Quickly search active invoices to verify serial numbers, check original invoice dates, customer names, and active status.
* **Warranty Progress Tracking**: Automatically calculates warranty expiry milestones and days remaining.
* **RMA Ticket Resolution**: Create return tickets, track current status (**Received**, **Testing**, **In Repair**, **Replaced**, **Refunded**), and append administrative logs.

---

## 🔐 Administrative Access Roles (RBAC)

The system enforces multi-tier **Role-Based Access Control (RBAC)** to match enterprise organizational hierarchies.

| Role Code | Title | System Permissions |
| :--- | :--- | :--- |
| **`super_admin`** | Super Administrator | Complete system access. View detailed activity streams, modify user permission levels, force database backups, and manage configurations. |
| **`admin`** | Business Administrator | Access to CRM, quotation/invoicing pipelines, and stock logs. Authorized to delete inventory or edit customer status. |
| **`employee`** | Operations Clerk | Frontline clerk. Create customer profiles, register quotes, log RMA claims, and manage daily stock levels. |

---

## 💻 Tech Stack & Environment configuration

* **Language**: TypeScript (Rigorous types, enums, interfaces)
* **Framework**: React 18+ (Functional hooks, clean state boundaries)
* **Build System**: Vite (Fast HMR configured, asset compression)
* **Styling**: Tailwind CSS (Sophisticated neumorphic surfaces, responsive layouts)
* **Icons**: Lucide React
* **Data Visualizations**: Recharts & D3 (Category sales distribution, direct net margins)
* **Real-time Database**: Firebase Firestore
* **Auth**: Firebase Authentication (Email/Password, Google Sign-In)

---

## 🔑 Demonstration Profiles

You can click any profile button on the login screen for instant access to pre-configured security clearings:

* **Super Admin**:
  * **Email**: `sarah.admin@inovexa.com`
  * **Role**: `super_admin`
* **Admin**:
  * **Email**: `alex.rivera@inovexa.com`
  * **Role**: `admin`
* **Employee**:
  * **Email**: `john.miller@inovexa.com`
  * **Role**: `employee`

* **Dynamic Signup**: Standard corporate signup is also supported. New accounts are assigned standard privileges, with elevated roles assigned automatically based on email domains (e.g., contains `super` &rarr; `super_admin`).
