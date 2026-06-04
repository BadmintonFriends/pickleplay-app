/*
 * LoginPage — PicklePlay Design System v1.0
 * 다크 테마, Optic Yellow 액센트
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { track } from "@/lib/mixpanel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Phone, ShieldCheck, Loader2, UserPlus } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");
  const [showRegisterBanner, setShowRegisterBanner] = useState(false);

  const getReturnTo = () => {
    const params = new URLSearchParams(window.location.search);
    return params.get("returnTo");
  };

  const buildRegisterUrl = () => {
    const returnTo = getReturnTo();
    const phoneDigits = phone.replace(/\D/g, "");
    const params = new URLSearchParams();
    if (returnTo) params.set("returnTo", returnTo);
    if (phoneDigits.length >= 10) params.set("phone", phoneDigits);
    const qs = params.toString();
    return qs ? `/register?${qs}` : "/register";
  };

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const returnTo = getReturnTo() || "/";
      navigate(returnTo);
    }
  }, [isAuthenticated, authLoading, navigate]);

  const sendCodeMutation = trpc.smsAuth.sendCode.useMutation({
    onSuccess: (data) => {
      track("Login - Send Code", { is_existing_user: data.isExistingUser });
      if (!data.isExistingUser) {
        setShowRegisterBanner(true);
        setError("");
      } else {
        setStep("code");
        setCountdown(180);
        setError("");
        setShowRegisterBanner(false);
      }
    },
    onError: (err) => {
      setError(err.message);
      setShowRegisterBanner(false);
    },
  });

  const loginMutation = trpc.smsAuth.login.useMutation({
    onSuccess: () => {
      track("Login - Success");
      const returnTo = getReturnTo() || "/";
      window.location.href = returnTo;
    },
    onError: (err) => {
      if (err.message.includes("가입되지 않은")) {
        setShowRegisterBanner(true);
        setError("");
      } else {
        setError(err.message);
      }
    },
  });

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown((c) => c - 1), 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const formatPhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 3) return digits;
    if (digits.length <= 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
    return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7, 11)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhone(e.target.value);
    setPhone(formatted);
    setShowRegisterBanner(false);
    setError("");
  };

  const handleSendCode = () => {
    setError("");
    const digits = phone.replace(/\D/g, "");
    if (digits.length < 10 || digits.length > 11) {
      setError("올바른 전화번호를 입력해주세요");
      return;
    }
    sendCodeMutation.mutate({ phone: digits });
  };

  const handleLogin = () => {
    setError("");
    if (code.length !== 6) {
      setError("인증번호 6자리를 입력해주세요");
      return;
    }
    const digits = phone.replace(/\D/g, "");
    loginMutation.mutate({ phone: digits, code });
  };

  const formatCountdown = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  if (authLoading) return null;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-5 py-3 bg-background border-b border-line">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-base font-bold text-foreground pr-6">로그인</h1>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-12">
        <Card className="w-full max-w-sm border-line-strong bg-card">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-12 h-12 flex items-center justify-center mb-3">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/93379316/QZUsZsvEpqV3TZCzpUyULD/logo-light_733385d9.png"
                alt="PicklePlay"
                className="w-10 h-10 object-contain"
              />
            </div>
            <CardTitle className="text-lg text-foreground">
              {step === "phone" ? "전화번호 입력" : "인증번호 입력"}
            </CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {step === "phone"
                ? "가입하신 전화번호를 입력해주세요"
                : `${phone}으로 발송된 인증번호를 입력해주세요`}
              {step === "code" && (
                <div className="mt-2 px-3 py-2 bg-primary/10 border border-primary/20 rounded-lg text-xs text-muted-foreground leading-relaxed">
                  인증번호는 국제번호 <span className="font-semibold text-foreground">+1 760-647-8528</span>에서 발송됩니다.
                  <br />
                  문자가 오지 않는 경우, 국제발신 차단 여부를 확인해주세요.
                </div>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* 미가입 번호 회원가입 안내 배너 */}
            {showRegisterBanner && (
              <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
                    <UserPlus className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">가입되지 않은 번호입니다</p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      입력하신 번호로 가입된 계정이 없습니다.
                      <br />
                      아래 버튼을 눌러 간편하게 회원가입하세요!
                    </p>
                  </div>
                </div>
                <Button
                  onClick={() => navigate(buildRegisterUrl())}
                  className="w-full bg-primary hover:bg-optic-deep text-primary-foreground"
                >
                  <UserPlus className="w-4 h-4 mr-2" />
                  회원가입하기
                </Button>
              </div>
            )}

            {step === "phone" ? (
              <>
                <Input
                  type="tel"
                  placeholder="010-1234-5678"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={13}
                  className="text-center text-lg tracking-wider bg-ink-3 border-line-strong text-foreground"
                  onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                />
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button
                  onClick={handleSendCode}
                  disabled={sendCodeMutation.isPending || phone.replace(/\D/g, "").length < 10}
                  className="w-full bg-primary hover:bg-optic-deep text-primary-foreground font-bold"
                >
                  {sendCodeMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  인증번호 받기
                </Button>
              </>
            ) : (
              <>
                <div className="relative">
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    maxLength={6}
                    autoComplete="one-time-code"
                    className="text-center text-2xl tracking-[0.5em] font-mono bg-ink-3 border-line-strong text-foreground"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    autoFocus
                  />
                  {countdown > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                      {formatCountdown(countdown)}
                    </span>
                  )}
                </div>
                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button
                  onClick={handleLogin}
                  disabled={loginMutation.isPending || code.length !== 6}
                  className="w-full bg-primary hover:bg-optic-deep text-primary-foreground font-bold"
                >
                  {loginMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  로그인
                </Button>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setStep("phone");
                      setCode("");
                      setError("");
                      setShowRegisterBanner(false);
                    }}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    전화번호 변경
                  </button>
                  <button
                    onClick={handleSendCode}
                    disabled={countdown > 0 || sendCodeMutation.isPending}
                    className="text-sm text-primary hover:underline disabled:text-muted-foreground"
                  >
                    {countdown > 0 ? `재발송 (${formatCountdown(countdown)})` : "인증번호 재발송"}
                  </button>
                </div>
              </>
            )}

            <div className="pt-2 border-t border-line text-center">
              <p className="text-sm text-muted-foreground">
                아직 회원이 아니신가요?{" "}
                <button onClick={() => navigate(buildRegisterUrl())} className="text-primary font-semibold hover:underline">
                  회원가입
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
