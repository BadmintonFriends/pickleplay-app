/*
 * HomePage — PicklePlay 랜딩 페이지
 * 디자인: Clean Sport Utility
 * - 대회 기능 정식 오픈
 * - 나머지 기능 2026년 중 오픈 예정
 */
import AppHeader from "@/components/AppHeader";
import { Trophy, MapPin, ShoppingBag, Users, Clock, Zap, ArrowRight, CheckCircle2 } from "lucide-react";
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
    color: "bg-[#C8E632]/20",
    iconColor: "text-[#8BA61E]",
    path: "/tournament",
    isOpen: true,
  },
  {
    icon: MapPin,
    title: "코트 예약",
    desc: "가까운 코트를 찾고 바로 예약",
    color: "bg-blue-50",
    iconColor: "text-blue-500",
    path: "/courts",
    isOpen: false,
  },
  {
    icon: ShoppingBag,
    title: "샵",
    desc: "패들, 볼, 의류 등 장비 쇼핑",
    color: "bg-amber-50",
    iconColor: "text-amber-500",
    path: "/shop",
    isOpen: false,
  },
  {
    icon: Users,
    title: "소셜",
    desc: "피클볼 커뮤니티와 함께하세요",
    color: "bg-purple-50",
    iconColor: "text-purple-500",
    path: "/social",
    isOpen: false,
  },
];

export default function HomePage() {
  const [, navigate] = useLocation();

  const handleFeatureClick = (f: typeof features[0]) => {
    if (f.isOpen) {
      navigate(f.path);
    } else {
      toast.info(`${f.title} 기능은 2026년 중 오픈 예정입니다.`);
    }
  };

  return (
    <div className="bg-[#f8f9fa]">
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
        <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/80 via-[#1a1a2e]/30 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-5">
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-[#C8E632]" />
            <span className="text-[11px] font-bold text-[#C8E632] uppercase tracking-wider">
              대회 참가 신청 오픈
            </span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">
            피클볼의 모든 것,
            <br />
            <span className="text-[#C8E632]">PicklePlay</span>
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
        <div className="bg-[#1a1a2e] rounded-2xl p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <CheckCircle2 className="w-4 h-4 text-[#C8E632]" />
            <span className="text-xs font-bold text-[#C8E632] uppercase tracking-wider">
              Now Open
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mb-1">
            대회 참가 신청 오픈!
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            지금 바로 피클볼 대회에 참가 신청하세요.
            <br />
            코트 예약, 장비 쇼핑, 커뮤니티는 2026년 중 오픈 예정입니다.
          </p>

          {/* 통계 박스 */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div className="bg-white/10 rounded-xl py-3">
              <p className="text-2xl font-black text-[#C8E632]">OPEN</p>
              <p className="text-[10px] text-gray-400 mt-0.5">대회 접수</p>
            </div>
            <div className="bg-white/10 rounded-xl py-3">
              <p className="text-2xl font-black text-white">4</p>
              <p className="text-[10px] text-gray-400 mt-0.5">주요 기능</p>
            </div>
            <div className="bg-white/10 rounded-xl py-3">
              <p className="text-2xl font-black text-white">1</p>
              <p className="text-[10px] text-gray-400 mt-0.5">등록 대회</p>
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
        <h2 className="text-base font-bold text-[#1a1a2e] mb-3">주요 기능</h2>
        <div className="space-y-2.5">
          {features.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.button
                key={f.title}
                className="w-full bg-white rounded-xl p-4 flex items-center gap-3.5 shadow-sm border border-gray-100 text-left hover:border-[#C8E632]/50 transition-all active:scale-[0.98]"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={idx + 3}
                onClick={() => handleFeatureClick(f)}
              >
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-[#1a1a2e]">{f.title}</h3>
                    {f.isOpen ? (
                      <span className="text-[8px] font-bold bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full uppercase">Open</span>
                    ) : (
                      <span className="text-[8px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">2026년 중</span>
                    )}
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{f.desc}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 shrink-0" />
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
        <div className="bg-gradient-to-br from-[#C8E632] to-[#a8c41e] rounded-2xl p-5">
          <span className="text-[10px] font-bold bg-[#1a1a2e] text-[#C8E632] px-2.5 py-1 rounded-full uppercase">
            접수 중
          </span>
          <h3 className="text-base font-bold text-[#1a1a2e] mt-3 leading-snug">
            리닝코리아 포항 전국
            <br />
            피클볼 대회
          </h3>
          <p className="text-xs text-[#1a1a2e]/70 mt-1.5">
            2026년 6월 14일(일) · 만인당실내체육관
          </p>
          <button
            onClick={() => navigate("/tournament")}
            className="mt-3 bg-[#1a1a2e] text-white text-xs font-bold px-5 py-2.5 rounded-full hover:bg-[#2a2a3e] transition-colors flex items-center gap-1.5"
          >
            참가 신청하기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.section>
    </div>
  );
}
