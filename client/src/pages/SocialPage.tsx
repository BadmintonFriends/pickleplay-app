/*
 * SocialPage — PicklePlay 소셜 화면
 * 디자인: Clean Sport Utility
 * - 소셜/리그 탭 전환
 * - 게시글 작성 입력
 * - 소셜 피드 (게시글, 좋아요, 댓글)
 * - 토너먼트 배너
 * - 시즌 랭킹
 * - 주간 활동 통계
 */
import AppHeader from "@/components/AppHeader";
import { Camera, Heart, MessageSquare, Share2, MoreHorizontal, BarChart3, Pencil } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const COMMUNITY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/community-league-MVrak7nsqS83bUFUbbzaTT.webp";
const TOURNAMENT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/tournament-banner-LBX7yPMXvLrn8gFavKRakn.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function SocialPage() {
  const [activeTab, setActiveTab] = useState<"social" | "league">("social");
  const [liked, setLiked] = useState(false);

  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader showSearch showCart />

      {/* 탭 전환 */}
      <div className="px-4 pb-3 flex gap-2">
        <button
          onClick={() => setActiveTab("social")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
            activeTab === "social"
              ? "bg-[#C8E632] text-[#1a1a2e] shadow-sm"
              : "bg-white text-gray-500 border border-gray-200"
          }`}
        >
          소셜
        </button>
        <button
          onClick={() => setActiveTab("league")}
          className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 ${
            activeTab === "league"
              ? "bg-[#C8E632] text-[#1a1a2e] shadow-sm"
              : "bg-white text-gray-500 border border-gray-200"
          }`}
        >
          리그
        </button>
      </div>

      {/* 게시글 작성 */}
      <motion.div className="px-4 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <div className="bg-white rounded-2xl p-3.5 flex items-center gap-3 border border-gray-100 shadow-sm">
          <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#C8E632] to-[#8ab500] flex items-center justify-center text-white text-sm font-bold shrink-0">
            민
          </div>
          <input
            type="text"
            placeholder="코트에서 무슨 일이 있었나요?"
            className="flex-1 text-sm text-gray-500 bg-transparent outline-none placeholder:text-gray-400"
          />
          <button className="p-2 rounded-full bg-[#C8E632]/20 hover:bg-[#C8E632]/30 transition-colors">
            <Camera className="w-4 h-4 text-[#8ab500]" />
          </button>
        </div>
      </motion.div>

      <AnimatePresence mode="wait">
        {activeTab === "social" ? (
          <motion.div
            key="social"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* 소셜 피드 게시글 */}
            <div className="px-4 pb-3">
              <div className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                {/* 작성자 정보 */}
                <div className="flex items-center justify-between p-3.5 pb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center text-white text-sm font-bold">
                      태
                    </div>
                    <div>
                      <p className="text-sm font-bold text-[#1a1a2e]">김태현</p>
                      <p className="text-[10px] text-gray-400">2시간 전 · 선셋파크 코트</p>
                    </div>
                  </div>
                  <button className="p-1.5 rounded-full hover:bg-gray-100 transition-colors">
                    <MoreHorizontal className="w-4 h-4 text-gray-400" />
                  </button>
                </div>

                {/* 게시글 내용 */}
                <div className="px-3.5 pb-2.5">
                  <p className="text-sm text-[#1a1a2e] leading-relaxed">
                    드디어 4.0 DUPR 등급에 진입했습니다! 🏓🔥 일요일 아침 고강도 훈련 크루 덕분에 가능했어요.
                  </p>
                </div>

                {/* 이미지 */}
                <div className="relative">
                  <img src={COMMUNITY_IMG} alt="피클볼 경기" className="w-full h-56 object-cover" />
                  <span className="absolute top-3 right-3 bg-[#C8E632] text-[#1a1a2e] text-xs font-bold px-2.5 py-1 rounded-lg shadow-sm">
                    4.1 DUPR
                  </span>
                </div>

                {/* 좋아요, 댓글, 공유 */}
                <div className="flex items-center gap-5 px-3.5 py-3">
                  <button
                    onClick={() => setLiked(!liked)}
                    className={`flex items-center gap-1.5 transition-colors ${liked ? "text-red-500" : "text-gray-500 hover:text-red-500"}`}
                  >
                    <Heart className={`w-5 h-5 ${liked ? "fill-red-500" : ""}`} />
                    <span className="text-xs font-medium">{liked ? 43 : 42}</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-gray-500 hover:text-blue-500 transition-colors">
                    <MessageSquare className="w-5 h-5" />
                    <span className="text-xs font-medium">12</span>
                  </button>
                  <button className="flex items-center gap-1.5 text-gray-500 hover:text-green-500 transition-colors">
                    <Share2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* 토너먼트 배너 */}
            <div className="px-4 pb-3">
              <div className="relative rounded-2xl overflow-hidden h-44">
                <img src={TOURNAMENT_IMG} alt="다운타운 쇼다운" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-2xl font-black italic leading-tight uppercase">
                    다운타운
                    <br />
                    쇼다운
                  </h3>
                  <p className="text-[10px] text-white/80 mt-1.5">
                    9월 12-14일 · 지역 예선 · 상금 ₩3,000,000
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="league"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* 시즌 랭킹 */}
            <section className="px-4 pb-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-1">
                  <div>
                    <h3 className="text-base font-black text-[#1a1a2e] uppercase tracking-wide">시즌 4 랭킹</h3>
                    <p className="text-[10px] text-gray-400 uppercase tracking-wider mt-0.5">A조 · 중부 지역</p>
                  </div>
                  <BarChart3 className="w-5 h-5 text-[#C8E632]" />
                </div>

                <div className="mt-3 space-y-0">
                  {[
                    { rank: 1, name: "박서연", dupr: "4.9", pts: "1,240" },
                    { rank: 2, name: "이준호", dupr: "4.7", pts: "1,115" },
                    { rank: 3, name: "최은지", dupr: "4.8", pts: "1,098" },
                  ].map((player) => (
                    <div
                      key={player.rank}
                      className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0"
                    >
                      <span className={`text-lg font-bold w-6 text-center ${
                        player.rank === 1 ? "text-[#C8E632]" : "text-gray-300"
                      }`}>
                        {player.rank}
                      </span>
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-gray-300 to-gray-500 flex items-center justify-center text-white text-sm font-bold">
                        {player.name[0]}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-bold text-[#1a1a2e]">{player.name}</p>
                        <p className="text-[10px] text-gray-400">{player.dupr} DUPR</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-[#1a1a2e]">{player.pts}</p>
                        <p className="text-[10px] text-gray-400">PTS</p>
                      </div>
                    </div>
                  ))}
                </div>

                <button className="w-full mt-3 bg-[#1a1a2e] text-white text-xs font-bold py-2.5 rounded-xl hover:bg-[#2a2a3e] transition-colors uppercase tracking-wider">
                  시즌 5 리그 참가
                </button>
              </div>
            </section>

            {/* 토너먼트 배너 */}
            <div className="px-4 pb-3">
              <div className="relative rounded-2xl overflow-hidden h-44">
                <img src={TOURNAMENT_IMG} alt="다운타운 쇼다운" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute bottom-4 left-4 text-white">
                  <h3 className="text-2xl font-black italic leading-tight uppercase">
                    다운타운
                    <br />
                    쇼다운
                  </h3>
                  <p className="text-[10px] text-white/80 mt-1.5">
                    9월 12-14일 · 지역 예선 · 상금 ₩3,000,000
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 주간 활동 */}
      <section className="px-4 pb-6">
        <div className="bg-[#C8E632] rounded-2xl p-5 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-bold text-[#1a1a2e]/60 uppercase tracking-wider">주간 활동</p>
            <p className="text-4xl font-black text-[#1a1a2e] mt-1">428</p>
            <p className="text-sm font-medium text-[#1a1a2e]/70">경기 진행</p>
            <div className="flex items-center gap-0 mt-3">
              <div className="w-7 h-7 rounded-full bg-[#1a1a2e] border-2 border-[#C8E632] flex items-center justify-center text-white text-[9px] font-bold">민</div>
              <div className="w-7 h-7 rounded-full bg-gray-600 border-2 border-[#C8E632] -ml-1.5 flex items-center justify-center text-white text-[9px] font-bold">태</div>
              <div className="w-7 h-7 rounded-full bg-gray-400 border-2 border-[#C8E632] -ml-1.5 flex items-center justify-center text-white text-[9px] font-bold">서</div>
              <span className="text-xs font-bold text-[#1a1a2e]/60 ml-1.5">+12</span>
            </div>
          </div>
          {/* 배경 장식 */}
          <div className="absolute top-2 right-2 w-24 h-24 rounded-full bg-[#bdd62e]/40" />
          <div className="absolute -bottom-6 -right-6 w-36 h-36 rounded-full bg-[#bdd62e]/30" />

          {/* FAB */}
          <button className="absolute bottom-4 right-4 w-12 h-12 bg-[#1a1a2e] rounded-full flex items-center justify-center shadow-lg hover:bg-[#2a2a3e] transition-colors z-10 active:scale-95">
            <Pencil className="w-5 h-5 text-white" />
          </button>
        </div>
      </section>
    </div>
  );
}
