/*
 * HomePage — KPL (Korea Pickleball Ranking) 대시보드
 * 첨부 UI 프로토타입 기반: 큰 숫자 중심, 다크 카드, Optic Yellow 액센트
 * KPL 점수 3.00~7.00 스케일, 랭킹 + 주간 변동 표시
 */
import AppHeader from "@/components/AppHeader";
import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import {
  Trophy,
  MapPin,
  ShoppingBag,
  Users,
  ArrowRight,
  ChevronRight,
  LogIn,
  UserPlus,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.08, duration: 0.4, ease: [0, 0, 0.2, 1] as const },
  }),
};

const features = [
  {
    icon: Trophy,
    title: "대회",
    desc: "전국 피클볼 대회 정보를 한눈에",
    path: "/tournament",
    isOpen: true,
  },
  {
    icon: MapPin,
    title: "코트 예약",
    desc: "가까운 코트를 찾고 바로 예약",
    path: "/courts",
    isOpen: false,
  },
  {
    icon: ShoppingBag,
    title: "샵",
    desc: "패들, 볼, 의류 등 장비 쇼핑",
    path: "/shop",
    isOpen: false,
  },
  {
    icon: Users,
    title: "소셜",
    desc: "피클볼 커뮤니티와 함께하세요",
    path: "/social",
    isOpen: false,
  },
];

/* ── KPL 위젯 (로그인 사용자) ─────────────────────── */
function KplWidget() {
  const { data, isLoading } = trpc.kpr.myDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="mx-5 mt-4">
        <div className="rounded-[20px] p-6 animate-pulse"
          style={{ background: "linear-gradient(135deg, #141414 0%, #1F1F1F 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="h-3 bg-white/10 rounded w-40 mb-5" />
          <div className="h-16 bg-white/10 rounded w-32 mb-3" />
          <div className="h-3 bg-white/10 rounded w-56 mb-5" />
          <div className="h-px bg-white/10 mb-4" />
          <div className="h-4 bg-white/10 rounded w-48" />
        </div>
      </div>
    );
  }

  if (!data) return null;

  const deltaPositive = data.ratingDelta > 0;
  const deltaNegative = data.ratingDelta < 0;
  const deltaZero = data.ratingDelta === 0;

  return (
    <motion.section
      className="mx-5 mt-4"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={0}
    >
      <div
        className="rounded-[20px] relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #141414 0%, #1F1F1F 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "24px 24px 20px",
        }}
      >
        {/* 배경 글로우 효과 */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-80px",
            right: "-80px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,255,61,0.20) 0%, transparent 65%)",
          }}
        />
        <div
          className="absolute pointer-events-none"
          style={{
            bottom: "-40px",
            left: "-40px",
            width: "160px",
            height: "160px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,255,61,0.06) 0%, transparent 70%)",
          }}
        />

        {/* 헤더: KPL 라벨 + 변동량 뱃지 */}
        <div className="flex justify-between items-center mb-[18px] relative">
          <div className="flex items-center gap-1.5">
            <span
              className="w-2 h-2 rounded-full bg-primary"
              style={{ boxShadow: "0 0 8px rgba(212,255,61,0.6)" }}
            />
            <span
              className="text-[9px] font-extrabold tracking-[0.22em] uppercase text-primary"
            >
              KPL · Korea Pickleball Ranking
            </span>
          </div>
          {!deltaZero && (
            <span
              className="inline-flex items-center gap-0.5 px-2.5 py-1 rounded-md text-[11px] font-extrabold tracking-[0.04em]"
              style={{
                background: "var(--color-primary, #D4FF3D)",
                color: "#0A0A0A",
                fontFamily: "'SF Mono', 'Menlo', monospace",
              }}
            >
              {deltaPositive ? (
                <ArrowUpRight className="w-3 h-3" />
              ) : (
                <ArrowDownRight className="w-3 h-3" />
              )}
              {Math.abs(data.ratingDelta).toFixed(2)}
            </span>
          )}
        </div>

        {/* 메인 점수 */}
        <div className="flex items-baseline gap-2 mb-1 relative">
          <span
            className="text-white leading-[0.95] tracking-[-0.04em]"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontStyle: "italic",
              fontSize: "64px",
            }}
          >
            {data.rating.toFixed(2)}
          </span>
          <span
            className="text-sm font-semibold tracking-[0.02em]"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontFamily: "'SF Mono', 'Menlo', monospace",
            }}
          >
            / {data.ratingMax.toFixed(2)}
          </span>
        </div>

        {/* 설명 */}
        <p
          className="text-[11px] font-medium tracking-[0.02em] mb-[18px] relative"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          내 KPL Rating · 한국 피클볼 공식 등급
        </p>

        {/* 구분선 + 랭킹 메타 */}
        <div className="border-t relative" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
          <div className="flex items-center pt-3.5">
            <span
              className="text-[10px] font-bold tracking-[0.16em] uppercase mr-2.5"
              style={{ color: "rgba(255,255,255,0.55)" }}
            >
              한국 랭킹
            </span>
            <span
              className="tracking-[-0.02em] text-primary"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontStyle: "italic",
                fontSize: "18px",
              }}
            >
              #{data.rank ?? "—"}
            </span>
            <span className="ml-auto text-[11px] font-semibold tracking-[0.02em]"
              style={{ color: "rgba(255,255,255,0.35)" }}
            >
              이번 주{" "}
              <strong className="text-primary font-extrabold">
                {data.weeklyRankDelta > 0
                  ? `+${data.weeklyRankDelta}`
                  : data.weeklyRankDelta < 0
                  ? `${data.weeklyRankDelta}`
                  : "—"}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </motion.section>
  );
}

/* ── KPL 소개 (비로그인 사용자) ───────────────────────── */
function KplIntro() {
  const [, navigate] = useLocation();

  return (
    <motion.section
      className="mx-5 mt-4"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={0}
    >
      <div
        className="rounded-[20px] relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #141414 0%, #1F1F1F 100%)",
          border: "1px solid rgba(255,255,255,0.08)",
          padding: "24px 24px 20px",
        }}
      >
        {/* 배경 글로우 효과 */}
        <div
          className="absolute pointer-events-none"
          style={{
            top: "-80px",
            right: "-80px",
            width: "280px",
            height: "280px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(212,255,61,0.10) 0%, transparent 65%)",
          }}
        />

        {/* 헤더 */}
        <div className="flex items-center gap-1.5 mb-[18px] relative">
          <span
            className="w-2 h-2 rounded-full opacity-40"
            style={{ background: "rgba(212,255,61,0.6)" }}
          />
          <span
            className="text-[9px] font-extrabold tracking-[0.22em] uppercase"
            style={{ color: "rgba(212,255,61,0.5)" }}
          >
            KPL · Korea Pickleball Ranking
          </span>
        </div>

        {/* 흐릿한 점수 */}
        <div className="flex items-baseline gap-2 mb-1 relative opacity-30">
          <span
            className="text-white leading-[0.95] tracking-[-0.04em]"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontStyle: "italic",
              fontSize: "64px",
            }}
          >
            3.00
          </span>
          <span
            className="text-sm font-semibold tracking-[0.02em]"
            style={{
              color: "rgba(255,255,255,0.55)",
              fontFamily: "'SF Mono', 'Menlo', monospace",
            }}
          >
            / 7.00
          </span>
        </div>

        {/* 설명 */}
        <p
          className="text-[11px] font-medium tracking-[0.02em] mb-4 relative"
          style={{ color: "rgba(255,255,255,0.35)" }}
        >
          로그인하고 나의 KPL Rating을 확인하세요
        </p>

        {/* CTA 버튼 */}
        <div className="flex gap-2.5 relative">
          <button
            onClick={() => navigate("/login")}
            className="flex-1 flex items-center justify-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold py-2.5 rounded-xl hover:bg-optic-deep transition-colors"
          >
            <LogIn className="w-3.5 h-3.5" />
            로그인
          </button>
          <button
            onClick={() => navigate("/register")}
            className="flex-1 flex items-center justify-center gap-1.5 text-foreground text-xs font-bold py-2.5 rounded-xl transition-colors"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
            }}
          >
            <UserPlus className="w-3.5 h-3.5" />
            회원가입
          </button>
        </div>
      </div>
    </motion.section>
  );
}

/* ── 메인 HomePage ────────────────────────────────────── */
export default function HomePage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading } = useAuth();

  const handleFeatureClick = (f: (typeof features)[0]) => {
    if (f.isOpen) {
      navigate(f.path);
    } else {
      toast.info(`${f.title} 기능은 2026년 중 오픈 예정입니다.`);
    }
  };

  return (
    <div className="bg-background min-h-screen">
      <AppHeader />

      {/* KPL 위젯 / 소개 */}
      {loading ? (
        <div className="mx-5 mt-4">
          <div className="rounded-[20px] p-6 animate-pulse"
            style={{ background: "linear-gradient(135deg, #141414 0%, #1F1F1F 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="h-3 bg-white/10 rounded w-40 mb-5" />
            <div className="h-16 bg-white/10 rounded w-32 mb-3" />
            <div className="h-3 bg-white/10 rounded w-56 mb-5" />
            <div className="h-px bg-white/10 mb-4" />
            <div className="h-4 bg-white/10 rounded w-48" />
          </div>
        </div>
      ) : isAuthenticated ? (
        <KplWidget />
      ) : (
        <KplIntro />
      )}

      {/* TOURNAMENT 섹션 */}
      <motion.section
        className="mt-6 px-5"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={2}
      >
        <div className="flex items-center justify-between mb-3">
          <h2
            className="text-base text-foreground tracking-tight"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontStyle: "italic",
              textTransform: "uppercase",
            }}
          >
            Tournament<span className="text-primary">.</span>
          </h2>
          <button
            onClick={() => navigate("/tournament")}
            className="text-[11px] text-muted-foreground font-medium flex items-center gap-0.5 hover:text-primary transition-colors"
          >
            전체보기 <ArrowRight className="w-3 h-3" />
          </button>
        </div>

        {/* 대회 카드 (가로 스크롤) */}
        <div className="flex gap-3 overflow-x-auto pb-2 -mx-5 px-5 snap-x snap-mandatory scrollbar-hide">
          <button
            onClick={() => navigate("/tournament")}
            className="snap-start shrink-0 w-[260px] rounded-2xl p-5 text-left transition-transform active:scale-[0.97]"
            style={{
              background: "var(--color-primary, #D4FF3D)",
              color: "#0A0A0A",
            }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="text-[9px] font-bold bg-black/20 text-black/80 px-2 py-0.5 rounded-full">
                D-47 · 접수중
              </span>
            </div>
            <p
              className="text-xl leading-tight mb-1"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontStyle: "italic",
                textTransform: "uppercase",
              }}
            >
              Pohang Cup<br />2026
            </p>
            <p className="text-[11px] font-medium opacity-70 mb-3">
              리닝코리아 포항 전국
            </p>
            <p className="text-[10px] font-bold opacity-60">
              06.14 (일) · 440팀
            </p>
          </button>

          <div
            className="snap-start shrink-0 w-[200px] rounded-2xl p-5 text-left"
            style={{
              background: "#1F1F1F",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-[9px] font-bold bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
              예정
            </span>
            <p
              className="text-lg text-foreground leading-tight mt-3 mb-1"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontStyle: "italic",
                textTransform: "uppercase",
              }}
            >
              Anyang<br />Open
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mb-3">
              안양 챔피언십 리그
            </p>
            <p className="text-[10px] text-muted-foreground font-bold">
              07.12 · 280팀
            </p>
          </div>

          <div
            className="snap-start shrink-0 w-[200px] rounded-2xl p-5 text-left"
            style={{
              background: "#1F1F1F",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span className="text-[9px] font-bold bg-white/10 text-white/50 px-2 py-0.5 rounded-full">
              예정
            </span>
            <p
              className="text-lg text-foreground leading-tight mt-3 mb-1"
              style={{
                fontFamily: "'Archivo Black', sans-serif",
                fontStyle: "italic",
                textTransform: "uppercase",
              }}
            >
              Haeundae<br />Cup
            </p>
            <p className="text-[11px] text-muted-foreground font-medium mb-3">
              해운대 피클볼 오픈
            </p>
            <p className="text-[10px] text-muted-foreground font-bold">
              08.03 · 120팀
            </p>
          </div>
        </div>
      </motion.section>

      {/* 주요 기능 */}
      <motion.section
        className="px-5 mt-6"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={4}
      >
        <h2 className="text-base font-extrabold text-foreground mb-3">주요 기능</h2>
        <div className="space-y-2.5">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.title}
                className="w-full bg-card rounded-xl p-4 flex items-center gap-3.5 border border-line-strong text-left hover:border-primary/50 transition-all active:scale-[0.98]"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={idx + 5}
                onClick={() => handleFeatureClick(f)}
              >
                <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                  <Icon className="w-5 h-5 text-primary" strokeWidth={2.2} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground">{f.title}</h3>
                    {f.isOpen ? (
                      <span className="text-[8px] font-bold bg-primary/20 text-primary px-1.5 py-0.5 rounded-full uppercase">
                        Open
                      </span>
                    ) : (
                      <span className="text-[8px] font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded-full">
                        2026년 중
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* 하단 여백 (탭바 높이만큼) */}
      <div className="h-24" />
    </div>
  );
}
