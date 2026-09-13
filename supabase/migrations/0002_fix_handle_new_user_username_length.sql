-- =============================================================================
-- Fix: handle_new_user() could generate a username longer than the 20-char
-- cap in profiles.username_format for any signup email whose local part
-- (before the @) was 16+ characters, causing the check constraint to fail
-- and the whole auth.signUp() call to error out with a generic database
-- error ("Couldn't create your account. Please try again.").
--
-- This migration is safe to run whether or not 0001_init.sql's original
-- (buggy) version of the function was already applied to this database —
-- `create or replace function` simply overwrites it with the fixed logic
-- below. No data is touched; this only changes username generation for
-- NEW signups going forward.
-- =============================================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate_username text;
  final_username text;
begin
  candidate_username := regexp_replace(lower(split_part(new.email, '@', 1)), '[^a-z0-9_]', '_', 'g');

  candidate_username := left(candidate_username, 15);
  if char_length(candidate_username) < 3 then
    candidate_username := candidate_username || left(new.id::text, 3 - char_length(candidate_username));
  end if;

  final_username := left(candidate_username || '_' || left(new.id::text, 4), 20);

  insert into public.profiles (id, username, display_name)
  values (new.id, final_username, split_part(new.email, '@', 1))
  on conflict (id) do nothing;

  insert into public.characters (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;
