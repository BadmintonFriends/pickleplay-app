/*
 * CourtsPage — PicklePlay 코트 예약 (커밍쑨)
 * 디자인: Clean Sport Utility
 * - 6월 정식 오픈 예정 안내
 * - 주요 기능 미리보기
 */
import AppHeader from "@/components/AppHeader";
import { MapPin, Search, Clock, Star, Navigation, Wifi } from "lucide-react";
import { motion } from "framer-motion";

const HERO_COURTS = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/hero-courts-FbYNhChEfY5c4b7aad6Cn3.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

const upcomingFeatures = [
  { icon: Search, title: "코트 검색", desc: "내 주변 피클볼 코트를 쉽게 찾아보세요" },
  { icon: Clock, title: "실시간 예약", desc: "빈 코트를 확인하고 바로 예약하세요" },
  { icon: Star, title: "코트 리뷰", desc: "다른 플레이어의 후기를 확인하세요" },
  { icon: Navigation, title: "길찾기", desc: "코트까지 빠른 경로를 안내해드려요" },
  { icon: Wifi, title: "실시간 혼잡도", desc: "코트 이용 현황을 실시간으로 확인하세요" },
];

export default function CourtsPage() {
  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader />

      {/* 페이지 타이틀 */}
      <motion.div className="px-4 pt-1 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl font-bold text-[#1a1a2e]">코트 예약</h1>
        <p className="text-xs text-gray-400 mt-0.5">가까운 코트를 찾고 바로 예약하세요</p>
      </motion.div>

      {/* 히어로 이미지 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="relative rounded-2xl overflow-hidden h-40">
          <img src={HERO_COURTS} alt="피클볼 코트" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-[#C8E632]" />
              <span className="text-xs font-bold text-[#C8E632]">전국 코트 정보 준비 중</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 커밍쑨 메인 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center mx-auto mb-3">
            <MapPin className="w-7 h-7 text-blue-400" />
          </div>
          <h2 className="text-base font-bold text-[#1a1a2e]">코트 예약 서비스 준비 중</h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            전국 피클볼 코트 정보와 실시간 예약 시스템을
            <br />
            준비하고 있습니다.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 bg-[#1a1a2e] text-white text-xs font-bold px-4 py-2 rounded-full">
            <Clock className="w-3.5 h-3.5 text-[#C8E632]" />
            2026년 중 오픈 예정
          </div>
        </div>
      </motion.section>

      {/* 준비 중인 기능 */}
      <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
        <h3 className="text-sm font-bold text-[#1a1a2e] mb-3">준비 중인 기능</h3>
        <div className="space-y-2">
          {upcomingFeatures.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="bg-white rounded-xl p-3.5 flex items-center gap-3 shadow-sm border border-gray-100 opacity-70"
                initial="hidden"
                animate="visible"
                variants={fadeUp}
                custom={idx + 4}
              >
                <div className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-[#1a1a2e]">{f.title}</h4>
                  <p className="text-[11px] text-gray-400 mt-0.5">{f.desc}</p>
                </div>
                <span className="text-[9px] font-bold text-gray-300 bg-gray-50 px-2 py-0.5 rounded-full shrink-0">
                  SOON
                </span>
              </motion.div>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
