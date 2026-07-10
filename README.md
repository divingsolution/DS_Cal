# 다이빙솔루션 일정 관리

## 구성
- `/index.html` : 공개 일정표
- `/admin.html` : 관리자 로그인 및 일정 추가·수정·삭제
- Supabase : 일정 데이터와 관리자 로그인
- Vercel : 웹사이트 배포

## 1. Supabase 프로젝트 만들기
1. Supabase에서 새 프로젝트를 생성합니다.
2. SQL Editor에서 `supabase.sql` 전체를 실행합니다.
3. Authentication > Providers > Email에서 일반 사용자 Sign up을 끕니다.
4. Authentication > Users에서 관리자 계정을 직접 생성합니다.

## 2. 연결 정보 입력
1. Project Settings > API에서 Project URL과 anon/public key를 확인합니다.
2. `config.example.js`를 복사해 `config.js`로 이름을 변경합니다.
3. URL과 anon key를 입력합니다.
4. `service_role` 키는 절대 사용하지 마세요.

## 3. GitHub/Vercel 배포
이 폴더의 파일을 GitHub 저장소 루트에 업로드하고 Vercel에 연결합니다.
정적 사이트이므로 Framework Preset은 `Other`, Build Command는 비워도 됩니다.

## 접속
- 공개 일정표: `https://내주소.vercel.app/`
- 관리자: `https://내주소.vercel.app/admin.html`

## 보안
현재 정책은 '로그인에 성공한 사용자'만 쓰기 가능합니다.
Supabase에서 일반 회원가입을 반드시 끄고, 관리자 사용자만 직접 생성하세요.
브라우저에는 anon key만 넣습니다.
