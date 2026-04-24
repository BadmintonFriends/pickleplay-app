import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ArrowLeft, Phone, ShieldCheck, Loader2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

export default function LoginPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  // 이미 로그인된 경우 홈으로 리다이렉트
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || "/";
      navigate(returnTo);
    }
  }, [isAuthenticated, authLoading, navigate]);

  const sendCodeMutation = trpc.smsAuth.sendCode.useMutation({
    onSuccess: (data) => {
      setStep("code");
      setCountdown(180);
      setError("");
      if (!data.isExistingUser) {
        setError("가입되지 않은 번호입니다. 회원가입을 진행해주세요.");
      }
    },
    onError: (err) => setError(err.message),
  });

  const loginMutation = trpc.smsAuth.login.useMutation({
    onSuccess: () => {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || "/";
      window.location.href = returnTo;
    },
    onError: (err) => {
      if (err.message.includes("가입되지 않은")) {
        setError("가입되지 않은 번호입니다. 회원가입을 진행해주세요.");
      } else {
        setError(err.message);
      }
    },
  });

  // 카운트다운 타이머
  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => setCountdown(c => c - 1), 1000);
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-white border-b">
        <button onClick={() => navigate("/")} className="p-1">
          <ArrowLeft className="w-5 h-5 text-gray-700" />
        </button>
        <h1 className="flex-1 text-center text-base font-semibold text-gray-900 pr-6">로그인</h1>
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-12">
        <Card className="w-full max-w-sm border-0 shadow-lg">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-[#C8E632]/20 flex items-center justify-center mb-3">
              {step === "phone" ? (
                <Phone className="w-7 h-7 text-[#1a1a2e]" />
              ) : (
                <ShieldCheck className="w-7 h-7 text-[#1a1a2e]" />
              )}
            </div>
            <CardTitle className="text-lg text-gray-900">
              {step === "phone" ? "전화번호 입력" : "인증번호 입력"}
            </CardTitle>
            <CardDescription className="text-sm">
              {step === "phone"
                ? "가입하신 전화번호를 입력해주세요"
                : `${phone}으로 발송된 인증번호를 입력해주세요`}
              {step === "code" && (
                <div className="mt-2 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700 leading-relaxed">
                  인증번호는 국제번호 <span className="font-semibold">+1 760-647-8528</span>에서 발송됩니다.<br />
                  문자가 오지 않는 경우, 국제발신 차단 여부를 확인해주세요.
                </div>
              )}
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            {step === "phone" ? (
              <>
                <Input
                  type="tel"
                  placeholder="010-1234-5678"
                  value={phone}
                  onChange={handlePhoneChange}
                  maxLength={13}
                  className="text-center text-lg tracking-wider"
                  onKeyDown={(e) => e.key === "Enter" && handleSendCode()}
                />
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <Button
                  onClick={handleSendCode}
                  disabled={sendCodeMutation.isPending || phone.replace(/\D/g, "").length < 10}
                  className="w-full bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white"
                >
                  {sendCodeMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
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
                    className="text-center text-2xl tracking-[0.5em] font-mono"
                    onKeyDown={(e) => e.key === "Enter" && handleLogin()}
                    autoFocus
                  />
                  {countdown > 0 && (
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">
                      {formatCountdown(countdown)}
                    </span>
                  )}
                </div>
                {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                <Button
                  onClick={handleLogin}
                  disabled={loginMutation.isPending || code.length !== 6}
                  className="w-full bg-[#1a1a2e] hover:bg-[#2a2a3e] text-white"
                >
                  {loginMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  로그인
                </Button>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => { setStep("phone"); setCode(""); setError(""); }}
                    className="text-sm text-gray-500 hover:text-gray-700"
                  >
                    전화번호 변경
                  </button>
                  <button
                    onClick={handleSendCode}
                    disabled={countdown > 0 || sendCodeMutation.isPending}
                    className="text-sm text-[#1a1a2e] hover:underline disabled:text-gray-300"
                  >
                    {countdown > 0 ? `재발송 (${formatCountdown(countdown)})` : "인증번호 재발송"}
                  </button>
                </div>
              </>
            )}

            <div className="pt-2 border-t text-center">
              <p className="text-sm text-gray-500">
                아직 회원이 아니신가요?{" "}
                <button
                  onClick={() => {
                    const params = new URLSearchParams(window.location.search);
                    const returnTo = params.get("returnTo");
                    navigate(returnTo ? `/register?returnTo=${encodeURIComponent(returnTo)}` : "/register");
                  }}
                  className="text-[#1a1a2e] font-semibold hover:underline"
                >
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
