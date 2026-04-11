-- ============================================================
-- Migration 003: Support tickets and live chat messages
-- ============================================================

create table if not exists public.support_tickets (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'queued', 'assigned', 'resolved', 'closed')),
  channel text not null default 'web_chat' check (channel in ('web_chat', 'whatsapp', 'email', 'phone')),
  priority text not null default 'normal' check (priority in ('low', 'normal', 'high', 'urgent')),
  issue_summary text not null,
  assigned_agent_name text,
  metadata jsonb not null default '{}',
  assigned_at timestamptz,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.support_messages (
  id uuid primary key default gen_random_uuid(),
  ticket_id uuid not null references public.support_tickets(id) on delete cascade,
  sender_type text not null check (sender_type in ('customer', 'assistant', 'agent', 'system')),
  sender_id uuid references public.profiles(id) on delete set null,
  message text not null,
  metadata jsonb not null default '{}',
  created_at timestamptz not null default now()
);

create index if not exists support_tickets_customer_id_idx on public.support_tickets(customer_id);
create index if not exists support_tickets_status_idx on public.support_tickets(status);
create index if not exists support_tickets_created_at_idx on public.support_tickets(created_at desc);
create index if not exists support_messages_ticket_id_idx on public.support_messages(ticket_id);
create index if not exists support_messages_created_at_idx on public.support_messages(created_at);

alter table public.support_tickets enable row level security;
alter table public.support_messages enable row level security;

-- Customers can access their own tickets.
create policy "support_tickets_select_owner" on public.support_tickets for select
  using (auth.uid() = customer_id);

create policy "support_tickets_insert_owner" on public.support_tickets for insert
  with check (auth.uid() = customer_id);

create policy "support_tickets_update_owner" on public.support_tickets for update
  using (auth.uid() = customer_id);

-- Admins can access all support tickets.
create policy "support_tickets_admin_all" on public.support_tickets for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );

-- Messages: customer can read/insert messages for own tickets.
create policy "support_messages_select_owner" on public.support_messages for select
  using (
    exists (
      select 1
      from public.support_tickets t
      where t.id = ticket_id and t.customer_id = auth.uid()
    )
  );

create policy "support_messages_insert_owner" on public.support_messages for insert
  with check (
    exists (
      select 1
      from public.support_tickets t
      where t.id = ticket_id and t.customer_id = auth.uid()
    )
  );

-- Admins can access all support messages.
create policy "support_messages_admin_all" on public.support_messages for all
  using (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  )
  with check (
    exists (
      select 1
      from public.profiles p
      where p.id = auth.uid() and p.role = 'admin'
    )
  );
