import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { pool } from "./pool";

async function exec(sql: string) {
  if (!pool) return;
  await pool.query(sql);
}

export async function initDbIfNeeded() {
  if (!pool) return;

  console.log("DB: initializing (DATABASE_URL set)");

  // Core tables
  await exec(`
    create table if not exists users (
      id text primary key,
      name text not null,
      email text not null unique,
      password_hash text not null,
      role text not null,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists drivers (
      id text primary key,
      name text not null,
      phone text,
      license text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists clients (
      id text primary key,
      name text not null,
      contact text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists companies (
      id text primary key,
      name text not null,
      phone text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists trips (
      id text primary key,
      created_by_user_id text not null references users(id) on delete restrict,
      driver_id text not null references drivers(id) on delete restrict,
      client_id text references clients(id) on delete restrict,
      company_id text not null references companies(id) on delete restrict,
      vehicle_type text,
      cnf text,
      flight_number text,
      meet_greet text not null default '',
      client_phone text,
      start_at timestamptz not null,
      end_at timestamptz not null,
      origin text not null,
      destination text not null,
      miles double precision not null,
      duration_minutes integer not null,
      price double precision not null,
      received boolean not null default false,
      notes text,
      created_at timestamptz not null default now()
    );
  `);

  // Lightweight migrations for existing DBs
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='vehicle_type') then
        null;
      else
        alter table trips add column vehicle_type text;
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='cnf') then
        null;
      else
        alter table trips add column cnf text;
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='flight_number') then
        null;
      else
        alter table trips add column flight_number text;
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='meet_greet') then
        -- Backward compatible: older DBs had meet_greet as boolean.
        if exists (
          select 1
          from information_schema.columns
          where table_name='trips' and column_name='meet_greet' and data_type='boolean'
        ) then
          alter table trips
            alter column meet_greet type text
            using (case when meet_greet then 'Yes' else '' end);
          alter table trips alter column meet_greet set default '';
          update trips set meet_greet='' where meet_greet is null;
          alter table trips alter column meet_greet set not null;
        end if;
      else
        alter table trips add column meet_greet text not null default '';
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='client_phone') then
        null;
      else
        alter table trips add column client_phone text;
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (
        select 1 from information_schema.columns
        where table_name='trips' and column_name='client_id' and is_nullable='NO'
      ) then
        alter table trips alter column client_id drop not null;
      end if;
    end $$;
  `);

  await exec(`create index if not exists idx_trips_driver_id on trips(driver_id);`);
  await exec(`create index if not exists idx_trips_client_id on trips(client_id);`);
  await exec(`create index if not exists idx_trips_company_id on trips(company_id);`);
  await exec(`create index if not exists idx_trips_start_at on trips(start_at);`);
  await exec(`create index if not exists idx_trips_vehicle_type on trips(vehicle_type);`);
  await exec(`create index if not exists idx_trips_cnf on trips(cnf);`);
  await exec(`create index if not exists idx_trips_flight_number on trips(flight_number);`);
  await exec(`create index if not exists idx_trips_meet_greet on trips(meet_greet);`);

  // Seed an admin user if DB is empty
  const countRes = await pool.query<{ count: string }>(`select count(*)::text as count from users;`);
  const count = Number(countRes.rows[0]?.count || "0");
  if (count === 0) {
    const passwordHash = bcrypt.hashSync(env.seedAdminPassword || "admin", 8);
    await pool.query(
      `insert into users (id, name, email, password_hash, role) values ($1,$2,$3,$4,$5)`,
      ["u_admin", "Admin", (env.seedAdminEmail || "admin@limo.local").toLowerCase(), passwordHash, "admin"]
    );
    console.log(
      `Seeded admin user: ${(env.seedAdminEmail || "admin@limo.local").toLowerCase()} / ${env.seedAdminPassword || "admin"}`
    );
  }

  console.log("DB: ready");
}




