create or replace function public.claim_generation_job(
  p_consultation_id uuid,
  p_requested_by text,
  p_source_image_id uuid default null,
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
    select 1
    from public.users
    where username = p_requested_by
  ) then
    raise exception 'The requesting user does not exist';
  end if;

  if exists (
    select 1
    from public.generation_requests
    where consultation_id = p_consultation_id
      and requested_by = p_requested_by
      and status in ('queued', 'running', 'completed')
  ) then
    raise exception 'This user has already started generation for this consultation';
  end if;

  select *
  into consultation_row
  from public.consultations
  where id = p_consultation_id
  for update;

  if consultation_row.id is null or consultation_row.phase = 'closed' then
    raise exception 'Consultation is not ready for generation';
  end if;

  if (
    select count(*)
    from public.consultation_feedback
    where consultation_id = p_consultation_id
  ) < consultation_row.feedback_threshold then
    raise exception 'Feedback threshold has not been reached';
  end if;

  update public.consultations
  set phase = 'preparing', updated_at = now()
  where id = p_consultation_id
    and phase = 'feedback_open';

  insert into public.generation_requests (
    consultation_id,
    requested_by,
    source_image_id,
    concept_count,
    provider,
    model,
    status,
    started_at
  ) values (
    p_consultation_id,
    p_requested_by,
    p_source_image_id,
    p_concept_count,
    'cloudflare',
    '@cf/black-forest-labs/flux-2-klein-4b',
    'running',
    now()
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

revoke execute on function public.claim_generation_job(uuid, text, uuid, integer)
from public, anon, authenticated;
grant execute on function public.claim_generation_job(uuid, text, uuid, integer)
to service_role;
