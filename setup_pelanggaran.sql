-- Jalankan sekali di Supabase > SQL Editor (project nrwexyezcbmsokelgkmp)

create table if not exists pv_siswa (
  id bigint generated always as identity primary key,
  nis text default '',
  nama text not null,
  kelas text not null,
  tahun_ajaran text not null,
  aktif boolean default true,
  created_at timestamptz default now(),
  unique (tahun_ajaran, kelas, nama)
);

create table if not exists pv_jenis (
  id bigint generated always as identity primary key,
  kategori text not null,           -- Kelakuan / Kedisiplinan / Kerapian
  nama text not null,
  poin int not null check (poin >= 0),
  aktif boolean default true,
  urutan int default 0,
  created_at timestamptz default now()
);

create table if not exists pv_catatan (
  id bigint generated always as identity primary key,
  tanggal date not null,
  tahun_ajaran text not null,
  siswa_id bigint references pv_siswa(id) on delete cascade,
  siswa_nama text not null,
  kelas text not null,
  jenis_id bigint references pv_jenis(id) on delete set null,
  kategori text,
  pelanggaran text not null,
  poin int not null,
  keterangan text default '',
  pelapor text default '',
  client_id text,                   -- id unik dari perangkat, mencegah data dobel saat kirim ulang
  created_at timestamptz default now()
);

create table if not exists pv_pengaturan (
  kunci text primary key,
  nilai text
);

-- Untuk database yang SUDAH dibuat sebelumnya, dua baris ini yang perlu dijalankan:
alter table pv_catatan add column if not exists client_id text;
create unique index if not exists pv_catatan_client_id on pv_catatan(client_id);

create index if not exists pv_catatan_siswa on pv_catatan(siswa_id);
create index if not exists pv_catatan_ta on pv_catatan(tahun_ajaran, tanggal);

-- Akses lewat anon key (proteksi admin hanya di sisi aplikasi)
alter table pv_siswa enable row level security;
alter table pv_jenis enable row level security;
alter table pv_catatan enable row level security;
alter table pv_pengaturan enable row level security;

do $$
declare t text;
begin
  foreach t in array array['pv_siswa','pv_jenis','pv_catatan','pv_pengaturan'] loop
    execute format('drop policy if exists "anon_all" on %I', t);
    execute format('create policy "anon_all" on %I for all to anon using (true) with check (true)', t);
  end loop;
end $$;

insert into pv_pengaturan (kunci, nilai) values ('tahun_ajaran_aktif', '2026/2027')
on conflict (kunci) do nothing;
