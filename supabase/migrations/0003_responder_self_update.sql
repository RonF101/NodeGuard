do $$
begin
  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'responders'
      and policyname = 'responders can update own availability'
  ) then
    create policy "responders can update own availability"
    on public.responders
    for update to authenticated
    using (profile_id = auth.uid())
    with check (profile_id = auth.uid());
  end if;
end $$;
