/*
 * HomePage — PicklePlay KPR Dashboard
 * 체스 ELO식 단일 점수 (초기 1000점, 상한 없음)
 * 대회 전적 없으면 Unranked
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
  TrendingUp,
  TrendingDown,
  Minus,
  Flame,
  Target,
  Swords,
  Crown,
  LogIn,
  UserPlus,
} from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";

/* ─── Animation variants ─── */
const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.45, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
};

/* ─── Feature list ─── */
const features = [
  { icon: Trophy, title: "대회", desc: "전국 피클볼 대회 정보를 한눈에", path: "/tournament", isOpen: true },
  { icon: MapPin, title: "코트 예약", desc: "가까운 코트를 찾고 바로 예약", path: "/courts", isOpen: false },
  { icon: ShoppingBag, title: "샵", desc: "패들, 볼, 의류 등 장비 쇼핑", path: "/shop", isOpen: false },
  { icon: Users, title: "소셜", desc: "피클볼 커뮤니티와 함께하세요", path: "/social", isOpen: false },
];

/* ─── KPR Dashboard (로그인 사용자) ─── */
function KprDashboard() {
  const { data, isLoading } = trpc.kpr.myDashboard.useQuery();

  if (isLoading) {
    return (
      <div className="mx-4 mt-3">
        <div className="bg-card rounded-2xl p-6 border border-border animate-pulse">
          <div className="h-24 bg-muted rounded-xl" />
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 rounded-xl bg-muted" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const deltaIcon =
    data.ratingDelta > 0 ? <TrendingUp className="w-3.5 h-3.5" /> :
    data.ratingDelta < 0 ? <TrendingDown className="w-3.5 h-3.5" /> :
    <Minus className="w-3.5 h-3.5" />;
  const deltaColor =
    data.ratingDelta > 0 ? "text-green-400" :
    data.ratingDelta < 0 ? "text-red-400" :
    "text-muted-foreground";
  const rankDeltaText =
    data.weeklyRankDelta > 0 ? `▲${data.weeklyRankDelta}` :
    data.weeklyRankDelta < 0 ? `▼${Math.abs(data.weeklyRankDelta)}` :
    "—";

  return (
    <motion.div
      className="mx-4 mt-3"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={0}
    >
      <div className="bg-card rounded-2xl border border-border overflow-hidden">
        {/* Header label */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
          <span
            className="text-[10px] font-bold tracking-[0.15em] text-red-500 uppercase"
            style={{ fontFamily: "'Archivo Black', sans-serif" }}
          >
            KPR · Korea Pickleball Ranking
          </span>
        </div>

        {/* Rating Score — 큰 숫자 하나 */}
        <div className="px-5 py-5 flex flex-col items-center">
          {data.isUnranked ? (
            <>
              <span
                className="text-2xl font-black text-muted-foreground tracking-wider uppercase"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                Unranked
              </span>
              <span className="text-xs text-muted-foreground mt-2">
                대회에 참가하면 랭킹이 부여됩니다
              </span>
            </>
          ) : (
            <>
              <span
                className="text-6xl font-black text-foreground tracking-tighter leading-none"
                style={{ fontFamily: "'Archivo Black', sans-serif" }}
              >
                {data.rating.toLocaleString()}
              </span>
              <span className="text-xs text-muted-foreground mt-1.5 font-mono tracking-wider">
                KPR POINTS
              </span>
              {/* Rating delta */}
              <div className={`flex items-center gap-1 text-xs font-semibold mt-2 ${deltaColor}`}>
                {deltaIcon}
                <span>{data.ratingDelta > 0 ? "+" : ""}{data.ratingDelta}</span>
                <span className="text-muted-foreground ml-1">최근 변동</span>
              </div>
            </>
          )}
        </div>

        {/* Stats grid */}
        <div className="grid grid-cols-3 gap-px bg-border/30">
          <StatCell
            icon={<Crown className="w-4 h-4 text-primary" />}
            value={data.isUnranked ? "—" : `#${data.rank}`}
            label="한국 랭킹"
            sub={data.isUnranked ? "Unranked" : `이번 주 ${rankDeltaText}`}
          />
          <StatCell
            icon={<Swords className="w-4 h-4 text-primary" />}
            value={`${data.totalMatches}`}
            label="총 경기"
            sub={`${data.wins}승 ${data.losses}패`}
          />
          <StatCell
            icon={<Target className="w-4 h-4 text-primary" />}
            value={`${data.winRate}%`}
            label="승률"
            sub={data.winStreak > 0 ? `${data.winStreak}연승 중` : "—"}
          />
        </div>

        {/* Best rating footer */}
        {!data.isUnranked && (
          <div className="px-5 py-3 flex items-center justify-between bg-muted/30">
            <div className="flex items-center gap-1.5">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="text-[11px] text-muted-foreground">최고 기록</span>
            </div>
            <span className="text-[11px] font-bold text-foreground">{data.bestRating.toLocaleString()}</span>
          </div>
        )}
      </div>
    </motion.div>
  );
}

/* ─── Stat Cell ─── */
function StatCell({
  icon,
  value,
  label,
  sub,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  sub: string;
}) {
  return (
    <div className="bg-card px-3 py-3.5 flex flex-col items-center text-center">
      {icon}
      <span className="text-lg font-black text-foreground mt-1 leading-none">{value}</span>
      <span className="text-[10px] text-muted-foreground mt-1">{label}</span>
      <span className="text-[9px] text-muted-foreground/70 mt-0.5">{sub}</span>
    </div>
  );
}

/* ─── KPR Intro (비로그인) ─── */
function KprIntro() {
  const [, navigate] = useLocation();

  return (
    <motion.div
      className="mx-4 mt-3"
      initial="hidden"
      animate="visible"
      variants={fadeUp}
      custom={0}
    >
      <div className="bg-card rounded-2xl border border-border overflow-hidden relative">
        {/* Header */}
        <div className="px-5 pt-4 pb-2 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-primary" />
          <span
            className="text-[10px] font-bold tracking-[0.15em] text-primary uppercase"
            style={{ fontFamily: "'Archivo Black', sans-serif" }}
          >
            KPR · Korea Pickleball Ranking
          </span>
        </div>

        {/* Blurred preview */}
        <div className="relative px-5 py-6">
          <div className="flex flex-col items-center opacity-30 blur-sm select-none pointer-events-none">
            <span
              className="text-6xl font-black text-foreground tracking-tighter leading-none"
              style={{ fontFamily: "'Archivo Black', sans-serif" }}
            >
              1,000
            </span>
            <span className="text-xs text-muted-foreground mt-1.5 font-mono tracking-wider">
              KPR POINTS
            </span>
          </div>

          {/* Overlay CTA */}
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-[2px]">
            <div className="text-center px-6">
              <h3 className="text-base font-bold text-foreground mb-1">
                나의 피클볼 실력을 확인하세요
              </h3>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                KPR은 대회 경기 데이터를 기반으로 한<br />
                한국 피클볼 공식 랭킹 시스템입니다
              </p>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={() => navigate("/login")}
                  className="flex items-center gap-1.5 bg-primary text-primary-foreground text-xs font-bold px-4 py-2.5 rounded-full hover:bg-optic-deep transition-colors"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  로그인
                </button>
                <button
                  onClick={() => navigate("/register")}
                  className="flex items-center gap-1.5 bg-secondary text-secondary-foreground text-xs font-bold px-4 py-2.5 rounded-full hover:bg-accent transition-colors"
                >
                  <UserPlus className="w-3.5 h-3.5" />
                  회원가입
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Info footer */}
        <div className="grid grid-cols-3 gap-px bg-border/30">
          <div className="bg-card px-3 py-3 text-center">
            <p className="text-sm font-bold text-foreground">1,000</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">초기 점수</p>
          </div>
          <div className="bg-card px-3 py-3 text-center">
            <p className="text-sm font-bold text-foreground">ELO</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">레이팅 방식</p>
          </div>
          <div className="bg-card px-3 py-3 text-center">
            <p className="text-sm font-bold text-foreground">대회</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">기반 산정</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── Main HomePage ─── */
export default function HomePage() {
  const { isAuthenticated, loading } = useAuth();
  const [, navigate] = useLocation();

  const handleFeatureClick = (f: (typeof features)[0]) => {
    if (f.isOpen) {
      navigate(f.path);
    } else {
      toast.info(`${f.title} 기능은 2026년 중 오픈 예정입니다.`);
    }
  };

  return (
    <div className="bg-background min-h-screen pb-24">
      <AppHeader />

      {/* KPR Section */}
      {loading ? (
        <div className="mx-4 mt-3">
          <div className="bg-card rounded-2xl p-6 border border-border animate-pulse">
            <div className="h-24 bg-muted rounded-xl" />
          </div>
        </div>
      ) : isAuthenticated ? (
        <KprDashboard />
      ) : (
        <KprIntro />
      )}

      {/* 주요 기능 */}
      <motion.section
        className="px-4 mt-5"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={2}
      >
        <h2 className="text-base font-extrabold text-foreground mb-3">주요 기능</h2>
        <div className="space-y-2.5">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.title}
                className="w-full bg-card rounded-xl p-4 flex items-center gap-3.5 border border-border text-left hover:border-primary/50 transition-all active:scale-[0.98]"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={idx + 3}
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
                <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
              </motion.button>
            );
          })}
        </div>
      </motion.section>

      {/* 첫 번째 대회 안내 */}
      <motion.section
        className="mx-4 mt-5 mb-6"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={7}
      >
        <div className="bg-primary rounded-2xl p-5">
          <span className="text-[10px] font-bold bg-ink text-primary px-2.5 py-1 rounded-full uppercase">
            접수 중
          </span>
          <h3 className="text-base font-bold text-primary-foreground mt-3 leading-snug">
            리닝코리아 포항 전국
            <br />
            피클볼 대회
          </h3>
          <p className="text-xs text-primary-foreground/70 mt-1.5">
            2026년 6월 14일(일) · 만인당실내체육관
          </p>
          <button
            onClick={() => navigate("/tournament")}
            className="mt-3 bg-ink text-foreground text-xs font-bold px-5 py-2.5 rounded-full hover:bg-ink-3 transition-colors flex items-center gap-1.5"
          >
            참가 신청하기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.section>
    </div>
  );
}
