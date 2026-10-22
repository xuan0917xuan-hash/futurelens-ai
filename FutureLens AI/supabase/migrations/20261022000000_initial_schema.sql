create extension if not exists "pgcrypto";

create type public.app_role as enum ('resident', 'developer');
create type public.consultation_status as enum ('draft', 'published', 'closed', 'archived');
create type public.concept_status as enum ('draft', 'published', 'retired');
create type public.generation_status as enum ('queued', 'running', 'completed', 'failed', 'cancelled');
create type public.feedback_status as enum ('pending', 'published', 'hidden', 'rejected');

create table public.users (
  username text primary key check (username ~ '^[a-z0-9_]{3,32}$'),
  email text,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role public.app_role not null default 'resident',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parks (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.park_images (
  id uuid primary key default gen_random_uuid(),
  park_id uuid not null references public.parks(id) on delete cascade,
  storage_key text not null,
  alt_text text not null,
  source_type text not null default 'official' check (source_type in ('official', 'stock', 'render')),
  is_published boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.consultations (
  id uuid primary key default gen_random_uuid(),
  park_id uuid not null references public.parks(id) on delete restrict,
  title text not null,
  description text,
  status public.consultation_status not null default 'draft',
  starts_at timestamptz,
  ends_at timestamptz,
  created_by text references public.users(username),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.consultation_images (
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  park_image_id uuid not null references public.park_images(id) on delete cascade,
  sort_order integer not null default 0,
  primary key (consultation_id, park_image_id)
);

create table public.generation_requests (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  requested_by text not null references public.users(username),
  source_image_id uuid references public.park_images(id) on delete set null,
  prompt text,
  needs_snapshot jsonb not null default '[]'::jsonb,
  provider text,
  model text,
  status public.generation_status not null default 'queued',
  failure_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create table public.personal_concepts (
  id uuid primary key default gen_random_uuid(),
  generation_request_id uuid references public.generation_requests(id) on delete set null,
  owner_username text not null references public.users(username),
  title text,
  description text,
  visibility text not null default 'private' check (visibility in ('private', 'shared', 'submitted')),
  status text not null default 'draft' check (status in ('draft', 'ready', 'archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.concept_sharing_permissions (
  personal_concept_id uuid not null references public.personal_concepts(id) on delete cascade,
  username text not null references public.users(username) on delete cascade,
  can_edit boolean not null default false,
  created_at timestamptz not null default now(),
  primary key (personal_concept_id, username)
);

create table public.official_concepts (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  name text not null,
  tagline text,
  description text not null,
  status public.concept_status not null default 'draft',
  created_by text references public.users(username),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.official_concept_features (
  id uuid primary key default gen_random_uuid(),
  official_concept_id uuid not null references public.official_concepts(id) on delete cascade,
  feature_type text not null,
  label text not null,
  score integer check (score between 1 and 5),
  description text,
  sort_order integer not null default 0
);

create table public.votes (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  official_concept_id uuid not null references public.official_concepts(id) on delete cascade,
  username text not null references public.users(username) on delete cascade,
  created_at timestamptz not null default now(),
  unique (consultation_id, username)
);

create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  official_concept_id uuid references public.official_concepts(id) on delete set null,
  username text not null references public.users(username) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  status public.feedback_status not null default 'pending',
  moderation_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.developer_responses (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  feedback_id uuid references public.feedback(id) on delete set null,
  author_username text not null references public.users(username),
  body text not null check (char_length(body) between 1 and 4000),
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.current_username()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select username from public.users where auth_user_id = auth.uid()
$$;

create or replace function public.can_access_personal_concept(concept_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.personal_concepts c
    where c.id = concept_id
      and (
        c.owner_username = public.current_username()
        or exists (
          select 1
          from public.concept_sharing_permissions p
          where p.personal_concept_id = c.id
            and p.username = public.current_username()
        )
      )
  )
$$;

create or replace function public.is_current_developer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.users
    where username = public.current_username() and role = 'developer'
  )
$$;

alter table public.users enable row level security;
alter table public.parks enable row level security;
alter table public.park_images enable row level security;
alter table public.consultations enable row level security;
alter table public.consultation_images enable row level security;
alter table public.generation_requests enable row level security;
alter table public.personal_concepts enable row level security;
alter table public.concept_sharing_permissions enable row level security;
alter table public.official_concepts enable row level security;
alter table public.official_concept_features enable row level security;
alter table public.votes enable row level security;
alter table public.feedback enable row level security;
alter table public.developer_responses enable row level security;

create policy "users can read their own profile"
  on public.users for select using (username = public.current_username());

create policy "published parks are readable"
  on public.parks for select using (status = 'active');

create policy "published park images are readable"
  on public.park_images for select using (is_published = true);

create policy "published consultations are readable"
  on public.consultations for select using (status = 'published');

create policy "published consultation images are readable"
  on public.consultation_images for select using (
    exists (
      select 1 from public.consultations c
      where c.id = consultation_id and c.status = 'published'
    )
  );

create policy "published official concepts are readable"
  on public.official_concepts for select using (status = 'published');

create policy "official features are readable with published concepts"
  on public.official_concept_features for select using (
    exists (
      select 1 from public.official_concepts c
      where c.id = official_concept_id and c.status = 'published'
    )
  );

create policy "residents can create their own votes"
  on public.votes for insert with check (username = public.current_username());

create policy "users can read their own votes"
  on public.votes for select using (username = public.current_username());

create policy "residents can create their own feedback"
  on public.feedback for insert with check (username = public.current_username());

create policy "published feedback is readable"
  on public.feedback for select using (
    status = 'published' or username = public.current_username()
  );

create policy "owners can manage personal concepts"
  on public.personal_concepts for all
  using (public.can_access_personal_concept(id))
  with check (owner_username = public.current_username());

create policy "shared users can read permissions"
  on public.concept_sharing_permissions for select using (
    username = public.current_username()
    or public.can_access_personal_concept(personal_concept_id)
  );

create policy "owners can manage sharing permissions"
  on public.concept_sharing_permissions for all
  using (
    exists (
      select 1 from public.personal_concepts c
      where c.id = personal_concept_id
        and c.owner_username = public.current_username()
    )
  )
  with check (
    exists (
      select 1 from public.personal_concepts c
      where c.id = personal_concept_id
        and c.owner_username = public.current_username()
    )
  );

create policy "developers can read responses"
  on public.developer_responses for select using (
    status = 'published' or author_username = public.current_username()
  );

create policy "developers can create responses"
  on public.developer_responses for insert with check (
    public.is_current_developer()
  );

create policy "developers can manage consultations"
  on public.consultations for all using (public.is_current_developer())
  with check (public.is_current_developer());

create policy "developers can manage official concepts"
  on public.official_concepts for all using (public.is_current_developer())
  with check (public.is_current_developer());

create policy "developers can manage official features"
  on public.official_concept_features for all using (public.is_current_developer())
  with check (public.is_current_developer());
