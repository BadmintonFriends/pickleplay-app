/*
 * SocialPage — PicklePlay 소셜 (커밍쑨)
 * 디자인: Clean Sport Utility
 * - 6월 정식 오픈 예정 안내
 * - 커뮤니티 기능 미리보기
 */
import AppHeader from "@/components/AppHeader";
import { Users, Clock, MessageSquare, Trophy, Heart, Share2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const COMMUNITY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/community-league-MVrak7nsqS83bUFUbbzaTT.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

const upcomingFeatures = [
  { icon: MessageSquare, title: "소셜 피드", desc: "피클볼 이야기를 자유롭게 나누세요" },
  { icon: Trophy, title: "리그 & 랭킹", desc: "시즌별 리그와 DUPR 랭킹 시스템" },
  { icon: Heart, title: "매치 후기", desc: "경기 후기와 하이라이트를 공유하세요" },
  { icon: Share2, title: "파트너 매칭", desc: "실력이 비슷한 파트너를 찾아보세요" },
  { icon: BarChart3, title: "통계 & 분석", desc: "내 경기 데이터와 성장 기록 확인" },
];

export default function SocialPage() {
  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader />

      {/* 페이지 타이틀 */}
      <motion.div className="px-4 pt-1 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl font-bold text-[#1a1a2e]">소셜</h1>
        <p className="text-xs text-gray-400 mt-0.5">피클볼 커뮤니티와 함께하세요</p>
      </motion.div>

      {/* 히어로 이미지 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="relative rounded-2xl overflow-hidden h-40">
          <img src={COMMUNITY_IMG} alt="피클볼 커뮤니티" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#1a1a2e]/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#C8E632]" />
              <span className="text-xs font-bold text-[#C8E632]">커뮤니티 준비 중</span>
            </div>
          </div>
        </div>
      </motion.section>

      {/* 커밍쑨 메인 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="bg-white rounded-2xl p-5 text-center shadow-sm border border-gray-100">
          <div className="w-16 h-16 rounded-full bg-purple-50 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-purple-400" />
          </div>
          <h2 className="text-base font-bold text-[#1a1a2e]">피클볼 커뮤니티 준비 중</h2>
          <p className="text-xs text-gray-400 mt-2 leading-relaxed">
            소셜 피드, 리그 랭킹, 파트너 매칭 등
            <br />
            다양한 커뮤니티 기능을 준비하고 있습니다.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 bg-[#1a1a2e] text-white text-xs font-bold px-4 py-2 rounded-full">
            <Clock className="w-3.5 h-3.5 text-[#C8E632]" />
            2026년 중 오픈 예정
          </div>
        </div>
      </motion.section>

      {/* 준비 중인 기능 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
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

      {/* 커뮤니티 참여 유도 */}
      <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={9}>
        <div className="bg-gradient-to-br from-[#C8E632]/20 to-[#C8E632]/5 rounded-2xl p-5 text-center border border-[#C8E632]/20">
          <h3 className="text-sm font-bold text-[#1a1a2e]">함께 만들어가는 커뮤니티</h3>
          <p className="text-xs text-gray-500 mt-2 leading-relaxed">
            피클플레이와 함께 대한민국 피클볼
            <br />
            커뮤니티의 시작을 함께하세요.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
