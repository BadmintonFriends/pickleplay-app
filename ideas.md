# PicklePlay 앱 디자인 브레인스토밍

## 디자인 분석 (첨부 스크린샷 기반)

### 핵심 디자인 특성
- **컬러 팔레트**: 라임/차트러스 그린(#C8E632 계열)이 주 액센트, 다크 네이비/차콜 텍스트, 화이트 배경, 연한 블루-그레이 서브 액센트
- **레이아웃**: 모바일 퍼스트 카드 기반 UI, 하단 탭 네비게이션 (HOME, COURTS, MATCHES, SOCIAL, SHOP)
- **타이포그래피**: 볼드하고 임팩트 있는 헤드라인 (대문자 사용), 깔끔한 본문 텍스트
- **카드 스타일**: 둥근 모서리, 가벼운 그림자, 명확한 정보 계층
- **인터랙션**: 필터 칩, 슬롯 시간 선택, 라이브 용량 표시기, CTA 버튼

---

<response>
<text>

## Idea 1: "Athletic Minimalism" — 스포츠 유틸리티 디자인

### Design Movement
스칸디나비안 미니멀리즘과 스포츠 브랜딩의 교차점. Nike SNKRS 앱과 Rapha 사이클링의 절제된 럭셔리 느낌.

### Core Principles
1. **기능적 공백**: 콘텐츠 사이 넉넉한 여백으로 정보 밀도를 조절
2. **모노크롬 + 단일 액센트**: 차콜/화이트 기반에 차트러스 그린 하나만 강조
3. **정보 계층 우선**: 시각적 장식보다 데이터 가독성 극대화
4. **촉각적 인터페이스**: 카드가 물리적 카드처럼 느껴지는 미세한 그림자와 깊이

### Color Philosophy
- 배경: #FAFAFA (따뜻한 화이트)
- 텍스트: #1A1A2E (딥 네이비)
- 액센트: #C8E632 (차트러스 라임) — 에너지와 활력, 피클볼의 테니스볼 컬러 연상
- 서브: #E8EDF2 (쿨 그레이), #D4E5F7 (라이트 블루)
- 경고: #FF4757 (코랄 레드)

### Layout Paradigm
풀 블리드 카드 스택 레이아웃. 모바일에서는 수직 스크롤 카드 스택, 데스크톱에서는 2-3 컬럼 매거진 그리드로 자연스럽게 전환. 하단 네비게이션은 모바일 전용, 데스크톱에서는 좌측 사이드 네비게이션으로 변환.

### Signature Elements
1. 차트러스 그린 CTA 버튼과 액센트 배지 — 모든 주요 액션에 일관 적용
2. 라운드 코너 카드 (16px radius) + 미세한 보더 라인
3. 상태 표시 칩 (TOP RATED, PUBLIC, BUSY 등) — 컬러 코딩된 작은 배지

### Interaction Philosophy
탭 전환 시 부드러운 페이드, 카드 호버 시 미세한 리프트 효과. 모든 인터랙션이 "가볍고 빠른" 느낌.

### Animation
- 페이지 전환: 200ms ease-out 페이드
- 카드 진입: stagger 50ms로 아래에서 위로 슬라이드
- 버튼 프레스: scale(0.97) → scale(1) 스프링 효과
- 탭 전환: 하단 인디케이터 슬라이드 + 콘텐츠 크로스페이드

### Typography System
- 헤드라인: DM Sans Bold/Black (임팩트 있으면서 현대적)
- 본문: DM Sans Regular/Medium
- 라벨/배지: DM Sans Medium, 대문자, letter-spacing 0.5px

</text>
<probability>0.08</probability>
</response>

<response>
<text>

## Idea 2: "Neo-Court Culture" — 스트리트 스포츠 감성

### Design Movement
스트리트웨어 문화와 코트 스포츠의 만남. Supreme의 대담함 + 테니스 클럽의 전통. 볼드한 타이포그래피와 그래픽 요소가 주도하는 레이아웃.

### Core Principles
1. **타이포그래피가 곧 디자인**: 큰 글씨가 레이아웃을 지배, 이미지는 보조
2. **컬러 블록킹**: 섹션마다 대담한 배경색 전환으로 시각적 리듬 생성
3. **오버사이즈 요소**: 버튼, 배지, 아이콘 모두 평균보다 크게
4. **거친 에너지**: 완벽한 정렬보다 약간의 비대칭이 주는 역동성

### Color Philosophy
- 배경: #FFFFFF와 #C8E632 교차 사용 (섹션별 컬러 블록)
- 텍스트: #0D0D0D (퓨어 블랙에 가까운)
- 액센트: #C8E632 (차트러스) — 대면적으로 과감하게 사용
- 서브: #CBD5E1 (슬레이트 블루), #FDE68A (웜 옐로우)
- 다크 섹션: #1E293B (슬레이트 900)

### Layout Paradigm
비대칭 블록 레이아웃. 카드들이 균일하지 않은 크기로 배치되어 매거진 같은 느낌. 모바일에서는 풀 와이드 카드와 하프 카드가 교차. 데스크톱에서는 masonry 스타일 그리드.

### Signature Elements
1. 이탤릭 대문자 헤드라인 — "DOWNTOWN SHOWDOWN" 스타일
2. 차트러스 배경의 대형 CTA 섹션
3. 둥근 아바타 + 랭킹 넘버의 조합

### Interaction Philosophy
대담하고 즉각적인 피드백. 버튼 클릭 시 강한 색상 반전, 스크롤 시 패럴랙스 효과.

### Animation
- 섹션 진입: clip-path reveal 애니메이션
- 카드: 스크롤 시 scale 0.95 → 1.0 트랜지션
- 탭 전환: 슬라이드 + 바운스
- 숫자 카운터: 롤링 넘버 애니메이션

### Typography System
- 헤드라인: Space Grotesk Bold/Black (기하학적이면서 개성 있는)
- 강조 헤드라인: Space Grotesk Black Italic
- 본문: Space Grotesk Regular
- 라벨: Space Grotesk Medium, uppercase, tracking wide

</text>
<probability>0.05</probability>
</response>

<response>
<text>

## Idea 3: "Clean Sport Utility" — 원본 디자인 충실 재현

### Design Movement
Material Design 3의 깔끔함과 iOS Human Interface의 직관성을 결합. 원본 디자인의 의도를 최대한 존중하면서 반응형으로 확장.

### Core Principles
1. **디자인 충실도**: 첨부된 4개 스크린의 레이아웃, 색상, 타이포그래피를 정확히 재현
2. **카드 중심 정보 구조**: 모든 콘텐츠가 카드 단위로 구성, 명확한 경계
3. **직관적 네비게이션**: 하단 탭 바 + 상단 검색/필터의 이중 구조
4. **상태 시각화**: 라이브 용량, 슬롯 가용성, 랭킹 등 실시간 데이터 표현

### Color Philosophy
- 배경: #F8F9FA (소프트 그레이 화이트)
- 카드: #FFFFFF (퓨어 화이트)
- 텍스트: #1A1A2E (딥 다크)
- 주 액센트: #C8E632 (차트러스 라임) — CTA, 활성 탭, 주요 배지
- 보조 액센트: #D6E4F0 (라이트 블루) — Find a Match 버튼 배경
- 경고/상태: #EF4444 (레드 - BUSY), #22C55E (그린 - OPEN)
- 다크 버튼: #1E293B (다크 슬레이트) — Find Match, Get Directions

### Layout Paradigm
모바일: 단일 컬럼 카드 스택 (원본 디자인 그대로). 태블릿: 2컬럼 카드 그리드. 데스크톱: 좌측 네비게이션 + 중앙 콘텐츠(최대 3컬럼) + 우측 사이드바(선택). 하단 탭 바는 모바일/태블릿에서만 표시.

### Signature Elements
1. 라임 그린 라운드 CTA 버튼 ("FIND A MATCH NOW", "Check Availability")
2. 상태 배지 시스템 (TOP RATED 노란배경, PUBLIC 초록배경, INDOOR/AC/PRO SHOP 회색칩)
3. 시간 슬롯 선택 칩 (10:00 AM - 3 Courts 형태)

### Interaction Philosophy
부드럽고 예측 가능한 인터랙션. 탭 전환은 즉각적, 카드 탭은 미세한 피드백, 필터는 즉시 적용.

### Animation
- 페이지 전환: 150ms ease 크로스페이드
- 카드 리스트: stagger 30ms 페이드인 + translateY(8px)
- 하단 탭: 활성 아이콘 scale(1.1) + 라임 배경 원형 표시
- 프로그레스 바: 800ms ease-out 너비 애니메이션
- 호버: 카드 translateY(-2px) + shadow 강화

### Typography System
- 헤드라인: DM Sans Bold (깔끔하고 현대적, 원본과 유사)
- 서브헤드: DM Sans SemiBold
- 본문: DM Sans Regular
- 라벨/배지: DM Sans Medium, 일부 대문자
- 숫자/가격: DM Sans Bold, 약간 큰 사이즈

</text>
<probability>0.07</probability>
</response>

---

## 선택: Idea 3 — "Clean Sport Utility"

원본 디자인을 최대한 충실하게 재현하면서 반응형으로 확장하는 접근법을 선택합니다. 사용자가 제공한 4개의 스크린 디자인이 이미 완성도 높은 UI/UX를 보여주고 있으므로, 이를 정확히 구현하는 것이 최선의 결과를 만들 것입니다.
