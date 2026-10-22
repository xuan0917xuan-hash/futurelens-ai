insert into public.parks (id, name, description)
values (
  '00000000-0000-0000-0000-000000000010',
  'Maple Street Park',
  'A demonstration consultation for the FutureLens AI prototype.'
)
on conflict (id) do nothing;

insert into public.park_images (id, park_id, storage_key, alt_text)
values
  ('00000000-0000-0000-0000-000000000201', '00000000-0000-0000-0000-000000000010', 'parks/maple-street-park.jpg', 'Maple Street Park'),
  ('00000000-0000-0000-0000-000000000202', '00000000-0000-0000-0000-000000000010', 'parks/riverside-green.jpg', 'Riverside Green')
on conflict (id) do nothing;

insert into public.consultations (id, park_id, title, description, status, created_by)
values (
  '00000000-0000-0000-0000-000000000001',
  '00000000-0000-0000-0000-000000000010',
  'Maple Street Park redesign',
  'Explore and compare demonstration park design concepts.',
  'published',
  null
)
on conflict (id) do nothing;

insert into public.consultation_images (consultation_id, park_image_id, sort_order)
values
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000201', 0),
  ('00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000202', 1)
on conflict do nothing;

insert into public.official_concepts (id, consultation_id, name, tagline, description, status, created_by, published_at)
values
  ('00000000-0000-0000-0000-000000000101', '00000000-0000-0000-0000-000000000001', 'Green Retreat', 'Shade, canopy & calm', 'A dense tree canopy with shaded timber pergolas and quiet seating nooks.', 'published', null, now()),
  ('00000000-0000-0000-0000-000000000102', '00000000-0000-0000-0000-000000000001', 'Family Park', 'Play, picnic & gather', 'A natural-timber playground, picnic lawns and family activity zones.', 'published', null, now()),
  ('00000000-0000-0000-0000-000000000103', '00000000-0000-0000-0000-000000000001', 'Inclusive Garden', 'Accessible for everyone', 'Gentle ramps, wide smooth paths and raised planters for everyone.', 'published', null, now())
on conflict (id) do nothing;
