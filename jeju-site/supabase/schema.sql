-- Supabase 대시보드 → SQL Editor 에 붙여넣고 Run 하세요.
-- 로그인한 사용자가 마음에 드는 사진을 담는 보관함 테이블입니다.

create table if not exists public.favorites (
    id          bigint generated always as identity primary key,
    user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
    image_id    bigint not null,
    preview_url text not null,
    page_url    text not null,
    tags        text,
    created_at  timestamptz not null default now(),
    unique (user_id, image_id)
);

-- 행 단위 보안(RLS): 내 데이터만 보고, 넣고, 지울 수 있게 한다.
alter table public.favorites enable row level security;

create policy "내 보관함 보기" on public.favorites
    for select to authenticated using (user_id = auth.uid());

create policy "내 보관함에 담기" on public.favorites
    for insert to authenticated with check (user_id = auth.uid());

create policy "내 보관함에서 빼기" on public.favorites
    for delete to authenticated using (user_id = auth.uid());
