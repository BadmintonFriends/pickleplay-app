/*
 * ShopPage — PicklePlay Design System v1.0
 * 샵 (커밍쑨)
 */
import AppHeader from "@/components/AppHeader";
import { ShoppingBag, Clock, Tag, Truck, CreditCard, Gift } from "lucide-react";
import { motion } from "framer-motion";

const PADDLE_HERO = "https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/paddle-hero-iTNBPcWJYZYmDurw99mTKy.webp";

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  visible: (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: [0, 0, 0.2, 1] as const },
  }),
};

const categories = [
  { emoji: "🏓", name: "패들", desc: "프로급 카본 패들부터 입문용까지" },
  { emoji: "🟡", name: "볼", desc: "실내·실외 공인구 및 연습구" },
  { emoji: "👕", name: "의류", desc: "기능성 스포츠웨어 컬렉션" },
  { emoji: "🎒", name: "액세서리", desc: "가방, 그립, 보호대 등" },
];

const upcomingFeatures = [
  { icon: Tag, title: "브랜드 직거래", desc: "공식 브랜드 제품을 합리적인 가격에" },
  { icon: Truck, title: "빠른 배송", desc: "주문 후 2~3일 내 배송" },
  { icon: CreditCard, title: "안전 결제", desc: "다양한 결제 수단 지원" },
  { icon: Gift, title: "회원 혜택", desc: "피클플레이 회원 전용 할인" },
];

export default function ShopPage() {
  return (
    <div className="bg-background">
      <AppHeader />

      <motion.div className="px-4 pt-1 pb-3" initial="hidden" animate="visible" variants={fadeUp} custom={0}>
        <h1 className="text-xl font-extrabold text-foreground">샵</h1>
        <p className="text-xs text-muted-foreground mt-0.5">피클볼 장비와 용품을 만나보세요</p>
      </motion.div>

      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={1}>
        <div className="relative rounded-2xl overflow-hidden h-44">
          <img src={PADDLE_HERO} alt="패들 컬렉션" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-ink/30 to-transparent" />
          <div className="absolute bottom-4 left-4">
            <div className="flex items-center gap-2 mb-1">
              <ShoppingBag className="w-4 h-4 text-primary" />
              <span className="text-xs font-bold text-primary">장비 쇼핑몰 준비 중</span>
            </div>
            <p className="text-[11px] text-white/70 mt-1">최고의 피클볼 장비를 한곳에서</p>
          </div>
        </div>
      </motion.section>

      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={2}>
        <div className="bg-card rounded-2xl p-5 text-center border border-line-strong">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <ShoppingBag className="w-7 h-7 text-primary" />
          </div>
          <h2 className="text-base font-bold text-foreground">피클볼 장비 쇼핑몰 준비 중</h2>
          <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
            패들, 볼, 의류, 액세서리까지
            <br />피클볼에 필요한 모든 장비를 준비하고 있습니다.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 bg-ink text-foreground text-xs font-bold px-4 py-2 rounded-full">
            <Clock className="w-3.5 h-3.5 text-primary" />
            2026년 중 오픈 예정
          </div>
        </div>
      </motion.section>

      <motion.section className="px-4 pb-4" initial="hidden" animate="visible" variants={fadeUp} custom={3}>
        <h3 className="text-sm font-bold text-foreground mb-3">준비 중인 카테고리</h3>
        <div className="grid grid-cols-2 gap-2.5">
          {categories.map((cat, idx) => (
            <motion.div
              key={cat.name}
              className="bg-card rounded-xl p-4 border border-line-strong opacity-70"
              initial="hidden" animate="visible" variants={fadeUp} custom={idx + 4}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <h4 className="text-xs font-bold text-foreground mt-2">{cat.name}</h4>
              <p className="text-[10px] text-muted-foreground mt-0.5 leading-relaxed">{cat.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section className="px-4 pb-6" initial="hidden" animate="visible" variants={fadeUp} custom={8}>
        <h3 className="text-sm font-bold text-foreground mb-3">쇼핑몰 특징</h3>
        <div className="space-y-2">
          {upcomingFeatures.map((f) => {
            const Icon = f.icon;
            return (
              <div key={f.title} className="bg-card rounded-xl p-3.5 flex items-center gap-3 border border-line-strong opacity-70">
                <div className="w-9 h-9 rounded-lg bg-ink-3 flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-xs font-bold text-foreground">{f.title}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{f.desc}</p>
                </div>
                <span className="text-[9px] font-bold text-muted-foreground bg-ink-3 px-2 py-0.5 rounded-full shrink-0">SOON</span>
              </div>
            );
          })}
        </div>
      </motion.section>
    </div>
  );
}
