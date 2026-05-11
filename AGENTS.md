---
description: Instructions building apps with MCP
globs: *
alwaysApply: true
---

# InsForge SDK Documentation - Overview

## What is InsForge?

Backend-as-a-service (BaaS) platform providing:

- **Database**: PostgreSQL with PostgREST API
- **Authentication**: Email/password + OAuth (Google, GitHub)
- **Storage**: File upload/download
- **AI**: Chat completions and image generation (OpenAI-compatible)
- **Functions**: Serverless function deployment
- **Realtime**: WebSocket pub/sub (database + client events)

## Installation

The following is a step-by-step guide to installing and using the InsForge TypeScript SDK for Web applications. If you're building other types of applications, please refer to:
- [Swift SDK documentation](/sdks/swift/overview) for iOS, macOS, tvOS, and watchOS applications.
- [Kotlin SDK documentation](/sdks/kotlin/overview) for Android applications.
- [REST API documentation](/sdks/rest/overview) for direct HTTP API access.

### 🚨 CRITICAL: Follow these steps in order

### Step 1: Download Template

Use the `download-template` MCP tool to create a new project with your backend URL and anon key pre-configured.

### Step 2: Install SDK

```bash
npm install @insforge/sdk@latest
```

### Step 3: Create SDK Client

You must create a client instance using `createClient()` with your base URL and anon key:

```javascript
import { createClient } from '@insforge/sdk';

const client = createClient({
  baseUrl: 'https://your-app.region.insforge.app',
  anonKey: 'your-anon-key-here'
});
```

**API BASE URL**: Your API base URL is `https://ym5zuqiu.us-east.insforge.app`.

## Getting Detailed Documentation

### 🚨 CRITICAL: Always Fetch Documentation Before Writing Code

InsForge provides official SDKs and REST APIs, use them to interact with InsForge services from your application code.

- [TypeScript SDK](/sdks/typescript/overview) - JavaScript/TypeScript
- [Swift SDK](/sdks/swift/overview) - iOS, macOS, tvOS, and watchOS
- [Kotlin SDK](/sdks/kotlin/overview) - Android and Kotlin Multiplatform
- [REST API](/sdks/rest/overview) - Direct HTTP API access

Before writing or editing any InsForge integration code, you **MUST** call the `fetch-docs` or `fetch-sdk-docs` MCP tool to get the latest SDK documentation.

### Use the InsForge `fetch-docs` MCP tool to get specific SDK documentation:

Available documentation types:
- `"instructions"` - Essential backend setup (START HERE)
- `"real-time"` - Real-time pub/sub via WebSockets
- `"db-sdk-typescript"` - Database operations with TypeScript SDK
- `"auth-sdk-typescript"` - TypeScript SDK methods for custom auth flows
- `"storage-sdk"` - File storage operations
- `"functions-sdk"` - Serverless functions invocation
- `"ai-integration-sdk"` - AI chat and image generation
- `"deployment"` - Deploy frontend applications via MCP tool

## Current Project State

### Project: Krear (Peluquería)

**Backend URL**: `https://ym5zuqiu.us-east.insforge.app`
**Anon Key**: Configured in `.env.local`

### Features Implemented:

1. ✅ **Mobile Touch Support**
   - Drag & Drop works on mobile (touch events + elementFromPoint)
   - Resize works on mobile (touch events + touch-action: none)
   - Data attributes for hit testing: data-time-slot, data-staff-id, data-appointment-id

2. ✅ **Blocked Slots (New)**
   - Table: `blocked_slots` (staff_id, start_time, end_time, reason)
   - Right-click on grid cell opens context menu
   - Options: 30 min, 1 hour, resto del día (intervalo cambió a 30 min)
   - Blocked slots render as gray boxes with striped pattern (45°)
   - Resize handles to extend blocked range
   - Delete button to remove blocks
   - RLS disabled for internal app

3. ✅ **Mobile Optimizations**
   - Header: smaller logo (28x24), "Peluquería Krear" title
   - Staff select: fixed position at top
   - Tables hide non-essential columns (phone/address/email)
   - Modals zIndex: 1100 (above context menu 1000)

4. ✅ **Usuarios (Profiles)**
   - Table: `profiles` (id, email, full_name, phone, role)
   - Role values: ADMIN, USER (constraint in DB)
   - Create user flow: auth.signUp() → creates Auth user → inserts profile
   - Page: `/dashboard/usuarios`
   - Uses SegmentedControl for role selection (Usuario/Administrador)

5. ✅ **Ticket Modal**
   - Modal que se abre desde "Generar ticket" en edit turno
   - Table dinámica con servicios del cliente activo
   - Puede agregar items extra o gastos adicionales
   - RadioGroup para seleccionar: Efectivo | Tarjeta/Transferencia
   - Cálculo automático de subtotales y total
   - Tabla `tickets` relacionada a `clients`
   - Tabla `ticket_items` para items individuales

6. ✅ **Time Slots Intervalo 30 min**
   - TIME_SLOTS: 09:00 a 21:00 cada 30 minutos
   - Grid height: 1000px (25 slots × 40px)
   - Divisor de posicionamiento: 750 (match con altura del contenedor)
   - 1 slot de 30 min = 40px (1.333px/min × 30min = 40px ✓)

7. ✅ **Sidebar Hover Effects**
   - Las opciones del sidebar tienen hover con transición suave de 150ms
   - Usa estado local `hoveredHref` para tracking
   - Color de hover: `oklch(71.5% 0.143 215.221 / 0.08)`

8. ✅ **Ticket Button Visibility Fix**
   - "Generar ticket" se oculta si el cliente ya tiene un ticket en esa fecha
   - `fetchTickets()` agregado al AppointmentGrid useEffect (antes solo se llamaba en tickets page)
   - Check inline: `tickets.some(t => t.client_id === clientId && dayjs(t.created_at).format('YYYY-MM-DD') === dayjs(selectedDate).format('YYYY-MM-DD'))`

9. ✅ **Proveedores y Pedidos**
   - Tabla `suppliers` (id, name, phone, address, balance)
   - Tabla `orders` (id, supplier_id, description, amount, payment_method, status, pay)
   - Página `/dashboard/suppliers` con CRUD completo
   - Modal de pedidos por proveedor (agregar/eliminar pedidos, actualizar balance)
   - Página `/dashboard/orders` con tabla de pedidos
   - Filtros por estado y proveedor (al activar filtros = toda la DB, más reciente primero)
   - Sin filtros = solo fecha activa

### Database Changes:

```sql
-- Services: renamed columns to English
ALTER TABLE services RENAME COLUMN precio_efectivo TO cash;
ALTER TABLE services RENAME COLUMN precio_tarjeta TO card;
ALTER TABLE services DROP COLUMN IF EXISTS price;

-- Blocked slots table
CREATE TABLE blocked_slots (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Tickets table (related to clients)
CREATE TABLE tickets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  client_id UUID NOT NULL REFERENCES clients(id),
  appointment_id UUID REFERENCES appointments(id),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cash', 'card')),
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Ticket items (individual line items)
CREATE TABLE ticket_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id UUID NOT NULL REFERENCES tickets(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id),
  unit_price NUMERIC(10, 2) NOT NULL,
  subtotal NUMERIC(10, 2) NOT NULL,
  is_extra BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Suppliers table
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  phone TEXT,
  address TEXT,
  balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Orders table (related to suppliers)
CREATE TABLE orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id UUID NOT NULL REFERENCES suppliers(id),
  description TEXT NOT NULL,
  amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  payment_method TEXT CHECK (payment_method IN ('cash', 'card', 'transfer')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'cancelled')),
  pay BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- RLS disabled for internal app
ALTER TABLE suppliers DISABLE ROW LEVEL SECURITY;
ALTER TABLE orders DISABLE ROW LEVEL SECURITY;

-- Profiles table
CREATE TABLE profiles (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('ADMIN', 'USER')),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### Files Reference:

- `lib/insforge.ts` - SDK client with Proxy for dynamic auth
- `app/providers.tsx` - Auth + Realtime setup
- `store/appointmentStore.ts` - State management (appointments, services, staff, clients, blockedSlots, tickets)
- `store/dateUtils.ts` - Date helpers
- `components/AppointmentGrid.tsx` - Calendar with drag/drop/resize/blocked slots + ticket button
- `components/TicketModal.tsx` - Modal para generar tickets con datatable dinámica
- `components/ServicesTable.tsx` - Service CRUD (cash/card columns)
- `components/StaffTable.tsx` - Staff CRUD
- `components/ClientsTable.tsx` - Client CRUD
- `components/UsuariosTable.tsx` - Users/Profiles CRUD
- `components/SuppliersTable.tsx` - Suppliers + Orders CRUD
- `components/OrdersTable.tsx` - Orders listing page with filters
- `components/Sidebar.tsx` - Navigation with hover effects

### RLS Policies:

```sql
-- appointments: public SELECT, open UPDATE
-- services: RLS disabled
-- staff: RLS disabled
-- clients: RLS disabled
-- blocked_slots: RLS disabled
-- profiles: RLS disabled
-- tickets: RLS disabled
-- ticket_items: RLS disabled
-- suppliers: RLS disabled
-- orders: RLS disabled
```

### Realtime Channels:
- appointments, appointments:%
- clients, clients:%
- services, services:%
- staff, staff:%
- blocked_slots
- profiles
- tickets (for future sync)

## Important Notes

- For auth: use `auth-sdk` for custom UI, or framework-specific components for pre-built UI
- SDK returns `{data, error}` structure for all operations
- Database inserts require array format: `[{...}]`
- Serverless functions have single endpoint (no subpaths)
- Storage: Upload files to buckets, store URLs in database
- AI operations are OpenAI-compatible
- **EXTRA IMPORTANT**: Use Tailwind CSS 3.4 (do not upgrade to v4). Lock these dependencies in `package.json`

## Bug Fix Notes

### Common Issues and Solutions:

1. **Stale closure in useEffect/realtime callbacks**:
   - Problem: Capturing `selectedDate` in useEffect create stale closures
   - Fix: Use `useAppointmentStore.getState().selectedDate` instead of direct reference

2. **Date timezone issues**:
   - Problem: selectedDate stored with browser time, causes day shift on convert
   - Fix: Always normalize to midnight (00:00:00) in setSelectedDate

3. **RLS blocking updates**:
   - Problem: RLS policy with auth.uid() blocks database updates
   - Fix: Use open policy for internal apps, or use Edge Functions for complex auth

4. **Resize handles modal opening**:
   - Problem: After resize, click event opens edit modal
   - Fix: Use pointerDownOnResizeHandle flag with setTimeout(50ms) delay to block click

5. **Grid positioning misalignment**:
   - Problem: Turnos se posicionaban fuera de las celdas con intervalo de 30 min
   - Root cause: ConTAINER height (1250px), CELLS height (25px) y DIVISOR (720) no coincidían
   - Fix: Contenedor 750px, celdas 30px, divisor 750 → todo alineado para 25 slots de 30 min (09:00-21:00)