/*
 * SocialPage — PicklePlay Design System v1.0
 * 소셜 (커밍쑨)
 */
import AppHeader from "@/components/AppHeader";
import { Users, Clock, MessageSquare, Trophy, Heart, Share2, BarChart3 } from "lucide-react";
import { motion } from "framer-motion";

const COMMUNITY_IMG = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/community-league-MVrak7nsqS83bUFUbbzaTT.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
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
    <div className="bg-background">
      <AppHeader />

      <motion.div className="px-4 pt-1 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl font-extrabold text-foreground">소셜</h1>
        <p className="text-xs text-muted-foreground mt-0.5">피클볼 커뮤니티와 함께하세요</p>
      </motion.div>

      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="relative rounded-2xl overflow-hidden h-40">
          <img src={COMMUNITY_IMG} alt="피클볼 커뮤니티" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
          <div className="absolute bottom-4 left-4 right-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">커뮤니티 준비 중</span>
            </div>
          </div>
        </div>
      </motion.section>

      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="bg-card rounded-2xl p-5 text-center border border-line-strong">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Users className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-base font-bold text-foreground">피클볼 커뮤니티 준비 중</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            소셜 피드, 리그 랭킹, 파트너 매칭 등
            <br />다양한 커뮤니티 기능을 준비하고 있습니다.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 bg-ink text-foreground text-xs font-bold px-4 py-2 rounded-full">
            <Clock className="w-3.5 h-3.5 text-primary" />
            2026년 중 오픈 예정
          </div>
        </div>
      </motion.section>

      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
        <h3 className="text-sm font-bold text-foreground mb-3">준비 중인 기능</h3>
        <div className="space-y-2">
          {upcomingFeatures.map((f, idx) => {
            const Icon = f.icon;
            return (
              <motion.div
                key={f.title}
                className="bg-card rounded-xl p-3.5 flex items-center gap-3 border border-line-strong opacity-70"
                initial="hidden" animate="visible" variants={fadeUp} custom={idx + 4}
              >
                <div className="w-9 h-9 rounded-lg bg-ink-3 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground">{f.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground bg-ink-3 px-2 py-0.5 rounded-full shrink-0">SOON</span>
              </motion.div>
            );
          })}
        </div>
      </motion.section>

      <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={9}>
        <div className="bg-gradient-to-br from-primary/20 to-primary/5 rounded-2xl p-5 text-center border border-primary/20">
          <h3 className="text-sm font-bold text-foreground">함께 만들어가는 커뮤니티</h3>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            피클플레이와 함께 대한민국 피클볼
            <br />커뮤니티의 시작을 함께하세요.
          </p>
        </div>
      </motion.section>
    </div>
  );
}
