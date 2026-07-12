-- Books uploaded as source material for AI course generation
create table if not exists ai_books (
  id            uuid primary key default gen_random_uuid(),
  title         text not null,
  author        text,
  category      text,               -- product-design | digital-marketing | etc.
  level         text,               -- basic | intermediate | advanced
  extracted_text text not null,     -- raw text extracted from the PDF
  page_count    int,
  file_size_kb  int,
  created_at    timestamptz default now()
);

-- Only admins (service role) should read/write this table
alter table ai_books enable row level security;

create policy "Service role only" on ai_books
  using (false)
  with check (false);
