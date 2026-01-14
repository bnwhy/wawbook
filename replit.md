# NuageBook - Personalized Children's Book Platform

## Overview

NuageBook is a French-language e-commerce platform for creating personalized children's books. Users can customize characters (appearance, names, traits), preview their book in real-time, and order physical printed copies. The platform features a full admin dashboard for managing products, orders, customers, shipping zones, and navigation menus.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React 18+ with TypeScript
- **Routing**: Wouter (lightweight React router)
- **State Management**: React Context API for global state (Books, Cart, Menu, Ecommerce)
- **Data Fetching**: TanStack React Query for server state management
- **UI Components**: shadcn/ui (Radix primitives + Tailwind CSS)
- **Styling**: Tailwind CSS v4 with custom theme extending cloud/accent color palette
- **Drag & Drop**: @dnd-kit for sortable admin interfaces
- **Fonts**: Google Fonts (Quicksand, Nunito, Chewy, Patrick Hand)

### Backend Architecture
- **Runtime**: Node.js with Express
- **Language**: TypeScript (ESM modules)
- **API Pattern**: RESTful JSON API under `/api/*` routes
- **Build Tool**: Vite for frontend, esbuild for server bundling

### Data Storage
- **Database**: PostgreSQL via Neon Serverless
- **ORM**: Drizzle ORM with Zod schema validation
- **Schema Location**: `shared/schema.ts` (shared between client/server)
- **Entities**: Users, Books, Customers, Orders, ShippingZones, Printers, Menus, Settings

### Key Design Patterns
1. **Shared Types**: Schema definitions in `shared/` are used by both frontend and backend
2. **Context Providers**: Wrap app with BooksProvider, MenuProvider, CartProvider, EcommerceProvider
3. **Wizard Configuration**: Books contain JSON `wizardConfig` defining customization tabs, variants, and options
4. **Content Configuration**: Books contain JSON `contentConfig` for page layouts, text elements, and image mappings

### Application Flow
1. User browses books on homepage or category pages
2. User enters wizard to customize character appearance and details
3. Real-time preview shows personalized book pages
4. User adds to cart, proceeds through checkout
5. Admin manages products, orders, and shipping via dashboard

## External Dependencies

### Database
- **Neon Serverless PostgreSQL**: Cloud-hosted Postgres accessed via `@neondatabase/serverless`
- **Connection**: `DATABASE_URL` environment variable required

### Template Engine Architecture (January 2026)
- **BrowserPool Service** (`server/services/browserPool.ts`): Persistent Playwright/Chromium instance launched at server startup, reused for all page renderings via `renderPage()` method
- **TemplateEngine Service** (`server/services/templateEngine.ts`): Loads EPUB templates, extracts HTML/CSS/images/fonts, caches in memory, generates user previews with variable injection
- **Key Features**:
  - Admin uploads EPUB once → server caches template in memory
  - Users send only variables for preview generation (no EPUB re-upload)
  - Fonts converted to Data URIs during template load for exact rendering
  - Images uploaded to object storage with URL mapping
  - Concurrency-limited rendering via p-queue (max 3 concurrent renders)
- **Admin Endpoints**: `/api/templates/load`, `/api/templates/list`, `/api/templates/:bookId/unload`
- **User Endpoint**: `/api/templates/:bookId/preview` (POST with variables)

### Image Personalization System (January 2026)
- **Filename Convention**: `page1_hero-father_skin-light_hair-brown.png`
  - `page{N}`: Specifies which page this image belongs to
  - `{characteristic}-{value}`: Key-value pairs for personalization options
- **Supported Characteristics**: hero, skin, hair, eyes, gender, outfit, accessory
- **Auto-generated Wizard**: From detected characteristics, system creates wizard tabs with French labels
- **CombinationKey Format**: Sorted alphabetically, e.g., `hair:brown_hero:father_skin:light`
- **Data Flow**:
  1. Admin uploads EPUB with named images
  2. Server parses filenames → extracts characteristics → builds wizardConfig
  3. Wizard displays tabs: Personnage principal, Couleur de peau, Couleur des cheveux, etc.
  4. User selections stored as `config.characters[tabId][variantId] = optionId`
  5. BookPreview generates combinationKey from selections → filters matching images

### Third-Party Libraries
- **cheerio**: HTML parsing and manipulation for template processing
- **sharp**: Image compression and optimization
- **p-queue**: Concurrency control for browser rendering
- **ag-psd**: PSD file parsing for importing design assets
- **html2canvas**: Screenshot generation for book previews
- **PDF Generation**: Custom utilities in `utils/pdfGenerator.ts`
- **Google Fonts Complete**: Font metadata for admin font selection

### AI/Generation Services
- **Gemini API**: Optional story text generation via `services/geminiService.ts`
- **Environment Variable**: `GEMINI_API_KEY` for AI features

### Build & Development
- **Vite Plugins**: React, Tailwind CSS, Replit-specific plugins (cartographer, dev-banner, error overlay)
- **Custom Plugin**: `vite-plugin-meta-images.ts` for OpenGraph image handling

### Shipping & Payments
- Architecture prepared for Stripe integration (dependency listed)
- Shipping zones configured per-country with multiple methods

### Stripe Integration & Performance (January 2026)
- **Stripe Sync Backfill**: The `syncBackfill()` function from `stripe-replit-sync` is disabled by default to prevent the Replit agent from running indefinitely
  - **Problem**: `syncBackfill()` synchronizes all historical Stripe data and can take hours or run indefinitely, blocking server startup
  - **Solution**: Made optional via `STRIPE_SYNC_BACKFILL` environment variable (default: disabled)
  - **Location**: `server/index.ts` in `initStripe()` function
  - **Rationale**: Webhooks handle real-time synchronization, so backfill is only needed for initial setup
  - **Usage**: Set `STRIPE_SYNC_BACKFILL=true` in environment variables only if you need to sync historical data (not recommended for production)