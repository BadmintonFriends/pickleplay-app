/*
 * MatchesPage — PicklePlay 매치 화면
 * 디자인: Clean Sport Utility
 * - 예정/완료 탭 전환
 * - 매치 카드 목록
 * - 매치 통계 요약
 */
import AppHeader from "@/components/AppHeader";
import { MapPin, Clock, Trophy, TrendingUp, Users } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const TOURNAMENT_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/tournament-banner-LBX7yPMXvLrn8gFavKRakn.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0, 0, 0.2, 1] as const },
  }),
};

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<"upcoming" | "completed">("upcoming");

  return (
    <div className="bg-[#f8f9fa]">
      <AppHeader showCart />

      {/* 페이지 타이틀 */}
      <motion.div className="px-4 pt-1 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl font-bold text-[#1a1a2e]">내 매치</h1>
        <p className="text-xs text-gray-400 mt-0.5">경기 일정과 결과를 확인하세요</p>
      </motion.div>

      {/* 통계 요약 */}
      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <Trophy className="w-5 h-5 text-[#C8E632] mx-auto mb-1" />
            <p className="text-xl font-black text-[#1a1a2e]">12</p>
            <p className="text-[10px] text-gray-400 mt-0.5">총 경기</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <TrendingUp className="w-5 h-5 text-green-500 mx-auto mb-1" />
            <p className="text-xl font-black text-[#1a1a2e]">75%</p>
            <p className="text-[10px] text-gray-400 mt-0.5">승률</p>
          </div>
          <div className="bg-white rounded-xl p-3 text-center shadow-sm border border-gray-100">
            <Users className="w-5 h-5 text-blue-500 mx-auto mb-1" />
            <p className="text-xl font-black text-[#1a1a2e]">4.1</p>
            <p className="text-[10px] text-gray-400 mt-0.5">DUPR</p>
          </div>
        </div>
      </motion.section>

      {/* 탭 전환 */}
      <div className="px-4 pb-4 flex gap-2">
        <button
          onClick={() => setActiveTab("upcoming")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "upcoming"
              ? "bg-[#1a1a2e] text-white shadow-md"
              : "bg-white text-gray-500 border border-gray-200"
          }`}
        >
          예정된 경기
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 ${
            activeTab === "completed"
              ? "bg-[#1a1a2e] text-white shadow-md"
              : "bg-white text-gray-500 border border-gray-200"
          }`}
        >
          완료된 경기
        </button>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === "upcoming" ? (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            transition={{ duration: 0.2 }}
          >
            {/* 예정 매치 1 */}
            <section className="px-4 pb-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-[#C8E632] text-[#1a1a2e] px-2.5 py-1 rounded-full uppercase">
                    <span className="w-1.5 h-1.5 bg-[#1a1a2e] rounded-full animate-pulse" />
                    오늘
                  </span>
                  <span className="text-xs text-gray-400 font-medium">단식</span>
                </div>
                <h3 className="text-base font-bold text-[#1a1a2e]">단식 대결</h3>
                <p className="text-sm text-gray-500 mt-0.5">vs. 김태현 선수</p>

                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="text-sm text-[#1a1a2e] font-medium">오후 4:30</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="text-sm text-[#1a1a2e] font-medium">04번 코트 (센터)</span>
                  </div>
                </div>

                <div className="flex gap-2 mt-4">
                  <button className="flex-1 bg-[#1a1a2e] text-white text-xs font-semibold py-2.5 rounded-xl hover:bg-[#2a2a3e] transition-colors">
                    길찾기
                  </button>
                  <button className="flex-1 bg-white text-red-500 text-xs font-semibold py-2.5 rounded-xl border border-red-200 hover:bg-red-50 transition-colors">
                    취소
                  </button>
                </div>
              </div>
            </section>

            {/* 예정 매치 2 */}
            <section className="px-4 pb-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[10px] font-bold bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full">
                    내일
                  </span>
                  <span className="text-xs text-gray-400 font-medium">복식</span>
                </div>
                <h3 className="text-base font-bold text-[#1a1a2e]">복식 친선전</h3>
                <p className="text-sm text-gray-500 mt-0.5">팀: 민수 & 서연 vs. 준호 & 은지</p>

                <div className="mt-3 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <Clock className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="text-sm text-[#1a1a2e] font-medium">오전 10:00</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                      <MapPin className="w-3.5 h-3.5 text-gray-500" />
                    </div>
                    <span className="text-sm text-[#1a1a2e] font-medium">더 키친 클럽 · 02번 코트</span>
                  </div>
                </div>

                <button className="w-full mt-4 bg-[#C8E632] text-[#1a1a2e] text-xs font-bold py-2.5 rounded-xl hover:bg-[#bdd62e] transition-colors">
                  상세 보기
                </button>
              </div>
            </section>

            {/* 토너먼트 배너 */}
            <section className="px-4 pb-6">
              <div className="relative rounded-2xl overflow-hidden h-36">
                <img src={TOURNAMENT_IMG} alt="토너먼트" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#1a1a2e]/80 to-transparent" />
                <div className="absolute inset-0 flex items-center px-4">
                  <div>
                    <span className="text-[10px] font-bold bg-[#C8E632] text-[#1a1a2e] px-2 py-0.5 rounded-full">대회</span>
                    <h3 className="text-base font-bold text-white mt-1.5">주말 토너먼트</h3>
                    <p className="text-[11px] text-white/70 mt-0.5">3월 29-30일 · 참가비 ₩30,000</p>
                    <button className="mt-2.5 bg-[#C8E632] text-[#1a1a2e] text-[11px] font-bold px-4 py-1.5 rounded-full hover:bg-[#bdd62e] transition-colors">
                      참가 신청
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </motion.div>
        ) : (
          <motion.div
            key="completed"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {/* 완료 매치 1 */}
            <section className="px-4 pb-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
                    승리
                  </span>
                  <span className="text-xs text-gray-400">3월 21일</span>
                </div>
                <h3 className="text-base font-bold text-[#1a1a2e]">단식 경기</h3>
                <p className="text-sm text-gray-500 mt-0.5">vs. 이준호</p>
                <div className="mt-3 bg-green-50 rounded-xl p-3.5 flex items-center justify-center">
                  <span className="text-2xl font-black text-green-700">11 - 7, 11 - 9</span>
                </div>
                <p className="text-xs text-center mt-2">
                  <span className="text-green-600 font-semibold">DUPR +0.1</span>
                  <span className="text-gray-400"> 획득</span>
                </p>
              </div>
            </section>

            {/* 완료 매치 2 */}
            <section className="px-4 pb-3">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold bg-red-100 text-red-600 px-2.5 py-0.5 rounded-full">
                    패배
                  </span>
                  <span className="text-xs text-gray-400">3월 19일</span>
                </div>
                <h3 className="text-base font-bold text-[#1a1a2e]">복식 경기</h3>
                <p className="text-sm text-gray-500 mt-0.5">팀: 민수 & 태현 vs. 서연 & 은지</p>
                <div className="mt-3 bg-red-50 rounded-xl p-3.5 flex items-center justify-center">
                  <span className="text-2xl font-black text-red-600">9 - 11, 7 - 11</span>
                </div>
                <p className="text-xs text-center mt-2">
                  <span className="text-red-500 font-semibold">DUPR -0.05</span>
                </p>
              </div>
            </section>

            {/* 완료 매치 3 */}
            <section className="px-4 pb-6">
              <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2.5 py-0.5 rounded-full">
                    승리
                  </span>
                  <span className="text-xs text-gray-400">3월 17일</span>
                </div>
                <h3 className="text-base font-bold text-[#1a1a2e]">단식 경기</h3>
                <p className="text-sm text-gray-500 mt-0.5">vs. 최은지</p>
                <div className="mt-3 bg-green-50 rounded-xl p-3.5 flex items-center justify-center">
                  <span className="text-2xl font-black text-green-700">11 - 5, 11 - 8</span>
                </div>
                <p className="text-xs text-center mt-2">
                  <span className="text-green-600 font-semibold">DUPR +0.15</span>
                  <span className="text-gray-400"> 획득</span>
                </p>
              </div>
            </section>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
