alter table public.consultations
  add column if not exists phase text not null default 'feedback_open'
    check (phase in ('feedback_open', 'preparing', 'voting_open', 'closed')),
  add column if not exists feedback_threshold integer not null default 15
    check (feedback_threshold between 1 and 10000);

create table public.consultation_feedback (
  id uuid primary key default gen_random_uuid(),
  consultation_id uuid not null references public.consultations(id) on delete cascade,
  username text not null references public.users(username) on delete cascade,
  source_image_id uuid not null references public.park_images(id) on delete restrict,
  body text not null check (char_length(body) between 1 and 4000),
  needs_snapshot jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  unique (consultation_id, username)
);

alter table public.generation_requests
  add column if not exists concept_count integer not null default 3
    check (concept_count between 1 and 6);

alter table public.official_concepts
  add column if not exists generation_request_id uuid references public.generation_requests(id) on delete cascade,
  add column if not exists source_park_image_id uuid references public.park_images(id) on delete restrict,
  add column if not exists design_brief text,
  add column if not exists community_needs jsonb not null default '[]'::jsonb,
  add column if not exists image_storage_key text;

create unique index if not exists one_active_generation_per_consultation
  on public.generation_requests (consultation_id)
  where status in ('queued', 'running', 'completed');

alter table public.consultation_feedback enable row level security;

create policy "residents can submit consultation feedback"
  on public.consultation_feedback for insert
  with check (
    username = public.current_username()
    and exists (
      select 1 from public.consultations c
      where c.id = consultation_id and c.phase = 'feedback_open'
    )
  );

create policy "users can read their consultation feedback"
  on public.consultation_feedback for select
  using (username = public.current_username() or public.is_current_developer());

create or replace function public.claim_generation_job(
  p_consultation_id uuid,
  p_requested_by text,
  p_concept_count integer default 3
)
returns public.generation_requests
language plpgsql
security definer
set search_path = public
as $$
declare
  consultation_row public.consultations;
  job public.generation_requests;
begin
  if not exists (
    select 1 from public.users
    where username = p_requested_by and role = 'developer'
  ) then
    raise exception 'Only developers can start generation';
  end if;

  select * into consultation_row
  from public.consultations
  where id = p_consultation_id
  for update;

  if consultation_row.id is null or consultation_row.phase <> 'preparing' then
    raise exception 'Consultation is not ready for generation';
  end if;
  if (select count(*) from public.consultation_feedback where consultation_id = p_consultation_id)
    < consultation_row.feedback_threshold then
    raise exception 'Feedback threshold has not been reached';
  end if;

  insert into public.generation_requests (
    consultation_id, requested_by, concept_count, provider, model, status, started_at
  ) values (
    p_consultation_id, p_requested_by, p_concept_count, 'cloudflare', '@cf/black-forest-labs/flux-2-klein-4b', 'running', now()
  )
  on conflict (consultation_id) where status in ('queued', 'running', 'completed')
  do nothing
  returning * into job;

  if job.id is null then
    raise exception 'A generation job already exists for this consultation';
  end if;
  return job;
end;
$$;

create or replace function public.publish_generation_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  job public.generation_requests;
  concept_total integer;
begin
  select * into job from public.generation_requests where id = p_job_id for update;
  select count(*) into concept_total
  from public.official_concepts
  where generation_request_id = p_job_id
    and status = 'draft'
    and image_storage_key is not null;

  if job.id is null or job.status <> 'running' or concept_total <> job.concept_count then
    raise exception 'Generation job is incomplete';
  end if;

  update public.official_concepts
  set status = 'published', published_at = now(), updated_at = now()
  where generation_request_id = p_job_id;
  update public.generation_requests
  set status = 'completed', completed_at = now()
  where id = p_job_id;
  update public.consultations
  set phase = 'voting_open', status = 'published', updated_at = now()
  where id = job.consultation_id;
  return true;
end;
$$;

create or replace function public.advance_feedback_phase()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.consultations c
  set phase = 'preparing', updated_at = now()
  where c.id = new.consultation_id
    and c.phase = 'feedback_open'
    and (
      select count(*) from public.consultation_feedback f
      where f.consultation_id = c.id
    ) >= c.feedback_threshold;
  return new;
end;
$$;

create trigger consultation_feedback_threshold
after insert on public.consultation_feedback
for each row execute function public.advance_feedback_phase();

insert into storage.buckets (id, name, public)
values ('park-concepts', 'park-concepts', false)
on conflict (id) do nothing;

revoke execute on function public.claim_generation_job(uuid, text, integer) from public, anon, authenticated;
revoke execute on function public.publish_generation_job(uuid) from public, anon, authenticated;
grant execute on function public.claim_generation_job(uuid, text, integer) to service_role;
grant execute on function public.publish_generation_job(uuid) to service_role;
