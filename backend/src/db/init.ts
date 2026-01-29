import bcrypt from "bcryptjs";
import { env } from "../config/env";
import { pool } from "./pool";

async function exec(sql: string) {
  if (!pool) return;
  try {
    await pool.query(sql);
  } catch (err: any) {
    console.error("DB migration error:", err?.message || err);
    throw err;
  }
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
      -- Backward compatible: older versions used "contact" (generic).
      -- Keep it if it already exists, but prefer phone/address moving forward.
      contact text,
      phone text,
      address text,
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
    create table if not exists vehicles (
      id text primary key,
      name text not null,
      brand text,
      model text,
      color text,
      plate text,
      active boolean not null default true,
      created_at timestamptz not null default now()
    );
  `);

  await exec(`
    create table if not exists app_settings (
      id text primary key,
      owner_company_id text references companies(id) on delete set null,
      logo_data_url text,
      enabled_modules text[] not null default '{}'::text[],
      pdf_company text,
      pdf_email text,
      pdf_phone text,
      created_at timestamptz not null default now(),
      updated_at timestamptz not null default now()
    );
  `);

  await exec(`
    insert into app_settings (id, enabled_modules)
    values ('main', array['dashboard','trips','drivers','clients','companies','users','driver-trips','driver-payouts-dashboard','driver-closing-report','home'])
    on conflict (id) do nothing;
  `);

  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='app_settings' and column_name='pdf_company') then
        null;
      else
        alter table app_settings add column pdf_company text;
      end if;
      if exists (select 1 from information_schema.columns where table_name='app_settings' and column_name='pdf_email') then
        null;
      else
        alter table app_settings add column pdf_email text;
      end if;
      if exists (select 1 from information_schema.columns where table_name='app_settings' and column_name='pdf_phone') then
        null;
      else
        alter table app_settings add column pdf_phone text;
      end if;
    end $$;
  `);

  await exec(`
    create table if not exists trips (
      id text primary key,
      created_by_user_id text not null references users(id) on delete restrict,
      driver_id text not null references drivers(id) on delete restrict,
      client_id text references clients(id) on delete restrict,
      company_id text not null references companies(id) on delete restrict,
      vehicle_id text references vehicles(id) on delete set null,
      trip_type text not null default 'transfer',
      hourly_start_time text,
      hourly_end_time text,
      vehicle_type text,
      cnf text,
      flight_number text,
      meet_greet text not null default '',
      client_phone text,
      start_at timestamptz not null,
      end_at timestamptz not null,
      origin text not null,
      destination text not null,
      stop text,
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
      if exists (select 1 from information_schema.columns where table_name='clients' and column_name='phone') then
        null;
      else
        alter table clients add column phone text;
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='clients' and column_name='address') then
        null;
      else
        alter table clients add column address text;
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='clients' and column_name='company_id') then
        null;
      else
        alter table clients add column company_id text references companies(id) on delete set null;
        raise notice 'Added company_id column to clients table';
      end if;
    end $$;
  `);
  // Best-effort migration: if older DB stored phone in "contact", copy it over when phone is empty.
  await exec(`
    update clients
      set phone = contact
    where phone is null and contact is not null and nullif(trim(contact),'') is not null;
  `);

  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='trip_type') then
        null;
      else
        alter table trips add column trip_type text not null default 'transfer';
        raise notice 'Added trip_type column to trips table';
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='vehicle_id') then
        null;
      else
        alter table trips add column vehicle_id text references vehicles(id) on delete set null;
        raise notice 'Added vehicle_id column to trips table';
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='hourly_start_time') then
        null;
      else
        alter table trips add column hourly_start_time text;
        raise notice 'Added hourly_start_time column to trips table';
      end if;
    end $$;
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='hourly_end_time') then
        null;
      else
        alter table trips add column hourly_end_time text;
        raise notice 'Added hourly_end_time column to trips table';
      end if;
    end $$;
  `);
  await exec(`
    update trips set trip_type='transfer' where trip_type is null;
  `);
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
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='stop') then
        null;
      else
        alter table trips add column stop text;
        raise notice 'Added stop column to trips table';
      end if;
    end $$;
  `);

  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='users' and column_name='driver_id') then
        null;
      else
        alter table users add column driver_id text references drivers(id) on delete set null;
        raise notice 'Added driver_id column to users table';
      end if;
    end $$;
  `);

  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='status') then
        null;
      else
        alter table trips add column status text not null default 'pending';
        raise notice 'Added status column to trips table';
      end if;
    end $$;
  `);

  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='started_at') then
        null;
      else
        alter table trips add column started_at timestamptz;
        raise notice 'Added started_at column to trips table';
      end if;
    end $$;
  `);

  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='finished_at') then
        null;
      else
        alter table trips add column finished_at timestamptz;
        raise notice 'Added finished_at column to trips table';
      end if;
    end $$;
  `);

  await exec(`create index if not exists idx_trips_driver_id on trips(driver_id);`);
  await exec(`create index if not exists idx_trips_status on trips(status);`);
  await exec(`create index if not exists idx_trips_client_id on trips(client_id);`);
  await exec(`create index if not exists idx_trips_company_id on trips(company_id);`);
  await exec(`create index if not exists idx_trips_start_at on trips(start_at);`);
  await exec(`create index if not exists idx_trips_vehicle_type on trips(vehicle_type);`);
  await exec(`create index if not exists idx_trips_cnf on trips(cnf);`);
  await exec(`create index if not exists idx_trips_flight_number on trips(flight_number);`);
  await exec(`create index if not exists idx_trips_meet_greet on trips(meet_greet);`);

  // Ensure Driver Payouts and Driver Closing Report modules are enabled for existing installs
  await exec(`
    update app_settings set enabled_modules = (
      select array_agg(distinct e) from unnest(enabled_modules || array['driver-payouts-dashboard','driver-closing-report']) e
    )
    where id = 'main'
      and not (enabled_modules @> array['driver-payouts-dashboard']);
  `);
  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='driver_value') then
        null;
      else
        alter table trips add column driver_value double precision;
        raise notice 'Added driver_value column to trips table';
      end if;
    end $$;
  `);

  await exec(`
    do $$
    begin
      if exists (select 1 from information_schema.columns where table_name='trips' and column_name='flight_details') then
        null;
      else
        alter table trips add column flight_details text;
        raise notice 'Added flight_details column to trips table';
      end if;
    end $$;
  `);

  // Migration: Remove company_id from vehicles and change year to color
  await exec(`
    do $$
    begin
      -- Add color column if it doesn't exist
      if not exists (select 1 from information_schema.columns where table_name='vehicles' and column_name='color') then
        alter table vehicles add column color text;
        raise notice 'Added color column to vehicles table';
      end if;
      
      -- Remove company_id constraint and column if it exists
      if exists (select 1 from information_schema.columns where table_name='vehicles' and column_name='company_id') then
        -- Drop foreign key constraint first
        if exists (
          select 1 from information_schema.table_constraints
          where table_name='vehicles' and constraint_name like '%company_id%'
        ) then
          alter table vehicles drop constraint if exists vehicles_company_id_fkey;
        end if;
        -- Drop the column
        alter table vehicles drop column company_id;
        raise notice 'Removed company_id column from vehicles table';
      end if;
      
      -- Remove year column if it exists
      if exists (select 1 from information_schema.columns where table_name='vehicles' and column_name='year') then
        alter table vehicles drop column year;
        raise notice 'Removed year column from vehicles table';
      end if;
    end $$;
  `);

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




