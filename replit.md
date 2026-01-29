# KitRunner - Portal de Inscrições

## Overview

KitRunner is a Brazilian sports event registration platform specializing in running events (marathons, trail runs, road races). The system enables athletes to discover events, register for races, select kit sizes, and complete payments. It includes a complete administrative panel for event organizers to manage events, modalities, registration batches, pricing, and attendee data.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite with HMR support
- **Routing**: Wouter for lightweight client-side routing
- **UI Components**: shadcn/ui (New York style) built on Radix UI primitives
- **Styling**: Tailwind CSS with custom design system (Navy Blue #032c6b primary, Yellow #e8b73d accent, Inter font)
- **State Management**: TanStack Query for server state, React Hook Form with Zod for form validation
- **Design Approach**: Mobile-first responsive design following sports/fitness platform conventions

### Backend Architecture
- **Server**: Express.js on Node.js using ES modules
- **Database**: PostgreSQL via Neon serverless driver
- **ORM**: Drizzle ORM with schema-first design and Drizzle-Zod for validation
- **Authentication**: Session-based with express-session, bcrypt password hashing
- **Role System**: Three roles (superadmin, admin, organizador) with role-based middleware

### Key Business Logic
- **Atomic Registration**: Transactional registration with `SELECT FOR UPDATE` locks to prevent overselling
- **Capacity Control**: Three-tier capacity system (event global limit, modality limit, batch limit)
- **Batch Management**: Registration batches with automatic transition when capacity or date limits are reached
- **Status vs Visibility**: Batches use `status` field for business logic and `ativo` boolean for client visibility
- **Voucher/Coupon System**: Support for access-controlled modalities requiring voucher codes
- **Modality Activation**: Field `ativo` (boolean, default true) allows deactivating modalities without deleting historical data

### Timezone Handling
- All timestamps stored in UTC in PostgreSQL (TIMESTAMPTZ)
- Converted to São Paulo timezone (America/Sao_Paulo, UTC-3) for API input/output using date-fns-tz

### Build Configuration
- **Path Aliases**: `@/*` for client source, `@shared/*` for shared schemas, `@assets/*` for media
- **Client Build**: Vite outputs to `dist/public`
- **Server Build**: esbuild bundles server to `dist/index.js`

## External Dependencies

### Database
- **@neondatabase/serverless**: Neon PostgreSQL serverless driver for database connectivity
- **drizzle-orm / drizzle-kit**: ORM and schema migration tooling
- **pg**: Node.js PostgreSQL client for connection pooling

### Payment Integration
- **Mercado Pago**: Payment gateway integration for PIX and credit card payments
- Webhook handling for payment status updates
- Polling job for payment confirmation

### UI Libraries
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **@tanstack/react-query**: Server state management and caching
- **react-hook-form / @hookform/resolvers / zod**: Form handling and validation
- **class-variance-authority / clsx / tailwind-merge**: Styling utilities

### Document Generation
- **jspdf / jspdf-autotable**: PDF generation for receipts and reports
- **xlsx**: Excel export functionality for admin reports

### Date/Time
- **date-fns / date-fns-tz**: Date manipulation and timezone conversion

### Background Jobs
- Order expiration job (30-minute payment timeout)
- Payment polling job for Mercado Pago status sync

## Portal do Organizador

### Architecture
- **Route**: `/organizadores/*` - Separate portal for event organizers (read-only)
- **Auth**: Uses same admin auth system with role "organizador"
- **Access Control**: Server-side filtering by organizerId in events endpoint (events.ts lines 52-59)

### Pages
- **OrganizerMeusEventosPage**: Lists all events belonging to the organizer
- **OrganizerEventDashboardPage**: Detailed read-only dashboard for a specific event with 6 tabs:
  1. Visão Geral - KPIs, vagas disponíveis, distribuição por gênero, lotes ativos e próximos
  2. Modalidades - Vagas por modalidade e lotes
  3. Camisas - Estoque por tamanho com percentuais, exportação Excel
  4. Inscrições - Resumo e link para lista completa
  5. Financeiro - Faturamento, taxas, métodos de pagamento
  6. Cupons - Lista de cupons utilizados
- **OrganizerEventInscritosPage**: Lista completa de inscritos com busca, filtros por status/modalidade e exportação Excel

### Sidebar Navigation
- Menu simplificado com apenas "Meus Eventos"

### API Endpoints (Organizer-accessible)
- `GET /api/admin/events` - Lists events (filtered by organizerId for organizers)
- `GET /api/admin/events/:id/stats` - Event statistics (validated via checkEventOwnership)
- `GET /api/admin/events/:id/registrations` - Registration list (validated via checkEventOwnership)
- `GET /api/admin/events/:id/voucher-stats` - Voucher usage statistics