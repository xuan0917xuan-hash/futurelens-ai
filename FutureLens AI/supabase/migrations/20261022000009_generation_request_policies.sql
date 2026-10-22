create policy "users can read their generation requests"
  on public.generation_requests for select
  using (requested_by = public.current_username());
