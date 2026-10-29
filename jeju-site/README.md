# 제주 갤러리 (Vite + Supabase + Pixabay)

- 회원가입 / 로그인: Supabase Auth (이메일 + 비밀번호)
- 사진: Pixabay API (서버 함수 `api/pixabay.js`가 대신 호출 → 키가 브라우저에 노출되지 않음)
- 로그인하면 사진을 ♥로 담아 "내 보관함"에서 볼 수 있음 (Supabase DB, 내 것만 보이도록 RLS 적용)
- 배포: Vercel

## 환경변수 3개

| 이름 | 어디에 쓰나 | 값을 얻는 곳 |
|---|---|---|
| `VITE_SUPABASE_URL` | 화면(브라우저) | Supabase 프로젝트 URL |
| `VITE_SUPABASE_ANON_KEY` | 화면(브라우저) | Supabase anon(publishable) 키 |
| `PIXABAY_API_KEY` | 서버 함수만 | Pixabay API 키 |

`VITE_`로 시작하는 값은 브라우저에 공개됩니다. Supabase anon 키는 공개되어도 되도록 설계된 키이고, 데이터는 RLS가 보호합니다.
**`service_role` 키는 절대 넣지 마세요.**

## 절차

### 1. Supabase 프로젝트 만들기
1. https://supabase.com 에 가입/로그인 → **New project**
2. 이름, DB 비밀번호, 지역(Northeast Asia - Seoul 권장)을 정하고 생성 (1~2분)
3. 왼쪽 **Project Settings → API**(또는 상단 **Connect**)에서 아래 두 값을 복사
   - **Project URL** → `VITE_SUPABASE_URL`
   - **anon public**(또는 publishable) 키 → `VITE_SUPABASE_ANON_KEY`

### 2. 보관함 테이블 만들기
1. 왼쪽 **SQL Editor → New query**
2. [`supabase/schema.sql`](supabase/schema.sql) 내용을 붙여넣고 **Run**

### 3. Pixabay API 키 받기
1. https://pixabay.com 가입/로그인
2. https://pixabay.com/api/docs/ 로 이동하면 로그인 상태에서 문서 안에 **내 API 키**가 표시됩니다 → `PIXABAY_API_KEY`

### 4. GitHub에 올리기
이 폴더(`jeju-site`)가 저장소 안에 있습니다. 푸시하면 됩니다.

### 5. Vercel 배포
1. https://vercel.com → **Add New → Project** → GitHub 저장소(`day3`) 선택
2. **Root Directory**를 `jeju-site`로 바꿉니다 (중요!)
3. Framework Preset은 **Vite**(자동 인식), Build `npm run build`, Output `dist`
4. **Environment Variables**에 위 3개를 이름·값 그대로 추가 (Production/Preview/Development 모두 체크)
5. **Deploy**

> 환경변수를 나중에 바꿨다면 **Deployments → Redeploy**를 해야 적용됩니다.

### 6. 로그인 주소 설정 (Supabase)
배포 주소가 `https://내사이트.vercel.app` 이라면:
1. Supabase **Authentication → URL Configuration**
2. **Site URL**에 `https://내사이트.vercel.app`
3. **Redirect URLs**에 `https://내사이트.vercel.app/**` 추가 (로컬 테스트용 `http://localhost:5173/**` 도 추가 가능)

### 7. (선택) 이메일 확인 끄기
기본값은 가입 후 메일의 확인 링크를 눌러야 로그인됩니다. 수업/테스트에서는
**Authentication → Sign In / Providers → Email → Confirm email**을 끄면 가입 즉시 로그인됩니다.
(무료 플랜은 시간당 보낼 수 있는 인증 메일 수가 적습니다.)

## 로컬 실행 (Node.js 필요)

```bash
cd jeju-site
npm install
cp .env.example .env     # 값 채우기
npm run dev              # 화면만 (사진 /api 는 동작하지 않음)
```

사진까지 로컬에서 보려면 `npm i -g vercel` 후 `vercel dev` 를 사용하세요 (`.env`의 값을 읽습니다).

## Pixabay 이용 시 참고
- 사진 아래 출처(Pixabay) 표시를 넣어 두었습니다.
- API 응답은 24시간 캐시하도록 설정했습니다 (`api/pixabay.js`).
- 이미지 주소를 장기간 그대로 연결(핫링크)하는 것은 약관상 제한될 수 있어, 실서비스로 키우려면 이미지를 직접 저장하는 방식을 검토하세요.
