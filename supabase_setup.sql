-- Profiler (kobles til Supabase Auth)
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  age int not null,
  created_at timestamp with time zone default now()
);

-- Stats per bruker
create table stats (
  user_id uuid references profiles(id) on delete cascade primary key,
  health_xp int default 0,
  strength_xp int default 0,
  endurance_xp int default 0,
  intelligence_xp int default 0,
  charisma_xp int default 0,
  discipline_xp int default 0
);

-- Standard quests (admin-lagde, like for alle)
create table quests (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  type text check (type in ('daily', 'weekly', 'boss')) not null,
  stat text check (stat in ('health','strength','endurance','intelligence','charisma','discipline')) not null,
  xp_reward int not null,
  is_standard boolean default true
);

-- Undertasks per quest
create table subtasks (
  id uuid primary key default gen_random_uuid(),
  quest_id uuid references quests(id) on delete cascade,
  label text not null,
  order_index int default 0
);

-- Brukerens quest-fremgang
create table user_quests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  quest_id uuid references quests(id) on delete cascade,
  completed_at timestamp with time zone default null,
  subtasks_done uuid[] default '{}',
  unique(user_id, quest_id)
);

-- Tillat brukere å lese/skrive egne data
alter table profiles enable row level security;
alter table stats enable row level security;
alter table user_quests enable row level security;

create policy "Bruker ser egen profil" on profiles for all using (auth.uid() = id);
create policy "Bruker ser egne stats" on stats for all using (auth.uid() = user_id);
create policy "Bruker ser egne quests" on user_quests for all using (auth.uid() = user_id);
create policy "Alle kan lese quests" on quests for select using (true);
create policy "Alle kan lese subtasks" on subtasks for select using (true);

-- Eksempel-quests
insert into quests (title, type, stat, xp_reward) values
  ('Morning Routine', 'daily', 'discipline', 50),
  ('Upper Body Workout', 'daily', 'strength', 80),
  ('Read 20 pages', 'daily', 'intelligence', 40),
  ('Run 5km', 'weekly', 'endurance', 150),
  ('BOSS: 100 push-ups in one session', 'boss', 'strength', 300);

-- Undertasks til Morning Routine
insert into subtasks (quest_id, label, order_index)
select id, 'Brush teeth', 0 from quests where title = 'Morning Routine';
insert into subtasks (quest_id, label, order_index)
select id, 'Wash face', 1 from quests where title = 'Morning Routine';
insert into subtasks (quest_id, label, order_index)
select id, 'Shower', 2 from quests where title = 'Morning Routine';

-- Undertasks til Upper Body Workout
insert into subtasks (quest_id, label, order_index)
select id, 'Bench press 10x3', 0 from quests where title = 'Upper Body Workout';
insert into subtasks (quest_id, label, order_index)
select id, 'Dips 12x3', 1 from quests where title = 'Upper Body Workout';
insert into subtasks (quest_id, label, order_index)
select id, 'Shoulder press 10x3', 2 from quests where title = 'Upper Body Workout';
