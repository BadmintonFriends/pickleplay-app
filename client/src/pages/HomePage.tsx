/*
 * HomePage — PicklePlay Design System v1.0
 * 다크 테마, Optic Yellow 액센트, Archivo Black 디스플레이
 */
import AppHeader from "@/components/AppHeader";
import { Trophy, MapPin, ShoppingBag, Users, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";
import { toast } from "sonner";

const HERO_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/hero-courts-FbYNhChEfY5c4b7aad6Cn3.webp";

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

export default function HomePage() {
  const [, navigate] = useLocation();

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

      {/* 히어로 섹션 */}
      <motion.section
        className="relative mx-4 mt-2 rounded-2xl overflow-hidden h-52"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={0}
      >
        <img src={HERO_IMG} alt="피클볼 코트" className="w-full h-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-primary" />
            <span className="text-overline text-primary">대회 참가 신청 오픈</span>
          </div>
          <h1 className="text-2xl font-extrabold text-white leading-tight">
            피클볼의 모든 것,
            <br />
            <span className="text-primary">PicklePlay</span>
          </h1>
        </div>
      </motion.section>

      {/* 서비스 안내 배너 */}
      <motion.section
        className="mx-4 mt-4"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
      >
        <div className="bg-card rounded-2xl p-5 text-center border border-line-strong">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span className="text-overline text-primary">Now Open</span>
          </div>
          <h2
            className="text-lg text-foreground mb-1"
            style={{
              fontFamily: "'Archivo Black', sans-serif",
              fontStyle: "italic",
              textTransform: "uppercase",
              letterSpacing: "-0.02em",
            }}
          >
            TOURNAMENT<span className="text-primary">.</span>
          </h2>
          <p className="text-xs text-muted-foreground leading-relaxed">
            지금 바로 피클볼 대회에 참가 신청하세요.
            <br />
            코트 예약, 장비 쇼핑, 커뮤니티는 2026년 중 오픈 예정입니다.
          </p>

          {/* 통계 박스 */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div className="bg-ink-3 rounded-xl py-3">
              <p
                className="text-xl text-primary"
                style={{ fontFamily: "'Archivo Black', sans-serif", fontStyle: "italic" }}
              >
                OPEN
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">대회 접수</p>
            </div>
            <div className="bg-ink-3 rounded-xl py-3">
              <p className="text-2xl font-extrabold text-foreground">4</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">주요 기능</p>
            </div>
            <div className="bg-ink-3 rounded-xl py-3">
              <p className="text-2xl font-extrabold text-foreground">1</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">등록 대회</p>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 주요 기능 미리보기 */}
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
                className="w-full bg-card rounded-xl p-4 flex items-center gap-3.5 border border-line-strong text-left hover:border-primary/50 transition-all active:scale-[0.98]"
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
