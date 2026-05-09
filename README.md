# Editing Instance

A premium React + TypeScript portfolio, services, digital product storefront, checkout flow, and Supabase-ready admin panel for video editors.

## Run Locally

```bash
npm install
npm run dev
```

## Supabase Setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env` and add your public Supabase URL and anon key.
3. Run `supabase/schema.sql` in the Supabase SQL editor.
4. Invite admin users through Supabase Auth.

The frontend only uses the public anon key. Keep service-role keys out of the browser.
