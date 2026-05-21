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
5. Add the Edge Function secrets. Use either SendGrid or Gmail SMTP:
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key EMAIL_TO=you@example.com EMAIL_FROM=verified-sender@example.com SENDGRID_API_KEY=your-sendgrid-api-key
   ```
   ```bash
   supabase secrets set SUPABASE_SERVICE_ROLE_KEY=your-service-role-key EMAIL_TO=you@example.com GMAIL_SMTP_USER=you@gmail.com GMAIL_SMTP_PASSWORD=your-gmail-app-password
   ```
6. Invite admin users through Supabase Auth.

The frontend only uses the public anon key. Keep service-role keys out of the browser.

## Admin Uploads

Visit `/admin` and sign in with an invited Supabase Auth user. The admin page uploads portfolio videos/posters to the `portfolio` bucket and digital asset covers/files to the `products` bucket, then saves the matching rows in `portfolio_projects` and `digital_products`.
