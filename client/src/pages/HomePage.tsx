/*
 * HomePage — PicklePlay 커밍쑨 랜딩 페이지
 * 디자인: Clean Sport Utility
 * - 6월 정식 오픈 안내
 * - 브랜드 소개 + 주요 기능 미리보기
 * - 사전 등록 유도
 */
import AppHeader from "@/components/AppHeader";
import { Trophy, MapPin, ShoppingBag, Users, Clock, Zap, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useLocation } from "wouter";

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
  },
  {
    icon: MapPin,
    title: "코트 예약",
    desc: "가까운 코트를 찾고 바로 예약",
    color: "bg-blue-50",
    iconColor: "text-blue-500",
    path: "/courts",
  },
  {
    icon: ShoppingBag,
    title: "샵",
    desc: "패들, 볼, 의류 등 장비 쇼핑",
    color: "bg-amber-50",
    iconColor: "text-amber-500",
    path: "/shop",
  },
  {
    icon: Users,
    title: "소셜",
    desc: "피클볼 커뮤니티와 함께하세요",
    color: "bg-purple-50",
    iconColor: "text-purple-500",
    path: "/social",
  },
];

export default function HomePage() {
  const [, navigate] = useLocation();

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
              2026년 6월 정식 오픈
            </span>
          </div>
          <h1 className="text-2xl font-black text-white leading-tight">
            피클볼의 모든 것,
            <br />
            <span className="text-[#C8E632]">PicklePlay</span>
          </h1>
        </div>
      </motion.section>

      {/* 카운트다운 배너 */}
      <motion.section
        className="mx-4 mt-4"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        custom={1}
      >
        <div className="bg-[#1a1a2e] rounded-2xl p-5 text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-[#C8E632]" />
            <span className="text-xs font-bold text-[#C8E632] uppercase tracking-wider">
              Coming Soon
            </span>
          </div>
          <h2 className="text-lg font-bold text-white mb-1">
            2026년 6월, 정식 서비스 오픈
          </h2>
          <p className="text-xs text-gray-400 leading-relaxed">
            대회 정보, 코트 예약, 장비 쇼핑, 커뮤니티까지
            <br />
            피클볼에 필요한 모든 것을 준비하고 있습니다.
          </p>

          {/* 카운트다운 박스 */}
          <div className="grid grid-cols-3 gap-2.5 mt-4">
            <div className="bg-white/10 rounded-xl py-3">
              <p className="text-2xl font-black text-[#C8E632]">D-62</p>
              <p className="text-[10px] text-gray-400 mt-0.5">오픈까지</p>
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
                onClick={() => navigate(f.path)}
              >
                <div className={`w-11 h-11 rounded-xl ${f.color} flex items-center justify-center shrink-0`}>
                  <Icon className={`w-5 h-5 ${f.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-sm font-bold text-[#1a1a2e]">{f.title}</h3>
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
            첫 번째 대회
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
            자세히 보기 <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.section>
    </div>
  );
}
