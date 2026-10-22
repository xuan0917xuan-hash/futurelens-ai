alter table public.generation_requests
  add column if not exists generation_type text not null default 'community'
  check (generation_type in ('community', 'personal'));

alter table public.personal_concepts
  add column if not exists source_park_image_id uuid references public.park_images(id) on delete set null,
  add column if not exists image_storage_key text;

drop index if exists public.one_generation_claim_per_user;
drop index if exists public.one_active_generation_per_consultation;

create unique index one_personal_generation_per_user
  on public.generation_requests (consultation_id, requested_by)
  where generation_type = 'personal' and status in ('queued', 'running', 'completed');

create unique index one_active_community_generation_per_consultation
  on public.generation_requests (consultation_id)
  where generation_type = 'community' and status in ('queued', 'running', 'completed');

create or replace function public.claim_personal_generation_job(
  p_consultation_id uuid,
  p_requested_by text,
  p_source_image_id uuid,
  p_needs_snapshot jsonb default '[]'::jsonb,
  p_prompt text default null
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
    where username = p_requested_by and role = 'resident'
  ) then
    raise exception 'Only residents can create personal generations';
  end if;

  select * into consultation_row
  from public.consultations
  where id = p_consultation_id
  for update;

  if consultation_row.id is null or consultation_row.phase not in ('feedback_open', 'preparing') then
    raise exception 'Personal generation is only available during the design stage';
  end if;

  insert into public.generation_requests (
    consultation_id, requested_by, source_image_id, prompt, needs_snapshot,
    concept_count, generation_type, provider, model, status, started_at
  ) values (
    p_consultation_id, p_requested_by, p_source_image_id, p_prompt, p_needs_snapshot,
    1, 'personal', 'cloudflare', '@cf/black-forest-labs/flux-2-klein-4b', 'running', now()
  )
  returning * into job;

  return job;
exception
  when unique_violation then
    raise exception 'You have already generated your one design image for this consultation';
end;
$$;

create or replace function public.complete_personal_generation_job(p_job_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.generation_requests
  set status = 'completed', completed_at = now()
  where id = p_job_id and generation_type = 'personal' and status = 'running';
  if not found then
    raise exception 'Personal generation job is not running';
  end if;
  return true;
end;
$$;

revoke execute on function public.claim_personal_generation_job(uuid, text, uuid, jsonb, text) from public, anon, authenticated;
revoke execute on function public.complete_personal_generation_job(uuid) from public, anon, authenticated;
grant execute on function public.claim_personal_generation_job(uuid, text, uuid, jsonb, text) to service_role;
grant execute on function public.complete_personal_generation_job(uuid) to service_role;
