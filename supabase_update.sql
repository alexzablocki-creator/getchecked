-- Add customer email and name to reservations table
alter table reservations add column if not exists customer_email text;
alter table reservations add column if not exists customer_name text;

-- Create pickup_tokens table for secure pickup links
create table if not exists pickup_tokens (
  id uuid default gen_random_uuid() primary key,
  claim_code text not null unique,
  station_id text not null,
  created_at timestamptz default now()
);

-- RLS for new columns and tables
alter table pickup_tokens enable row level security;
create policy "Public can insert pickup tokens" on pickup_tokens for insert with check (true);
create policy "Public can read pickup tokens" on pickup_tokens for select using (true);
