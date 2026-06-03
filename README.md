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
4. Deploy the contact function:
   ```bash
   supabase functions deploy send-contact-email
   ```
5. Add the Edge Function secrets for Gmail SMTP. Use a Gmail app password for `GMAIL_SMTP_PASSWORD`, not your normal Google account password:
   ```bash
   supabase secrets set EMAIL_TO=kjyotish124@gmail.com GMAIL_SMTP_USER=your-gmail-address@gmail.com GMAIL_SMTP_PASSWORD=your-gmail-app-password GMAIL_SMTP_HOST=smtp.gmail.com GMAIL_SMTP_PORT=465
   ```
6. Invite admin users through Supabase Auth.

The frontend only uses the public anon key. Keep service-role keys out of the browser.

## Admin Uploads

Visit `/admin` and sign in with an invited Supabase Auth user. The admin page uploads portfolio videos/posters to the `portfolio` bucket and digital asset covers/files to the `products` bucket, then saves the matching rows in `portfolio_projects` and `digital_products`.

For existing Supabase projects, run `supabase/admin-upload-upgrade.sql` in the SQL editor before using the new admin forms. It adds custom product and portfolio category tables, upload storage policies, LUT before/after preview fields, YouTube portfolio link support, and portfolio video format for uploaded landscape or portrait entries. Custom portfolio categories are saved automatically into `portfolio_categories` when you publish them. Uploaded products appear on `/products`; the home page shows two products from each category and links to the full category list.
