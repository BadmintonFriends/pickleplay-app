/*
 * RegisterPage — PicklePlay Design System v1.0
 * 다크 테마, Optic Yellow 액센트
 */
import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Phone, ShieldCheck, UserPlus, Loader2, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/_core/hooks/useAuth";

type Step = "phone" | "code" | "info";

export default function RegisterPage() {
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [error, setError] = useState("");

  const [name, setName] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "">("");
  const [birthDate, setBirthDate] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const phoneParam = params.get("phone");
    if (phoneParam) {
      const digits = phoneParam.replace(/\D/g, "");
      if (digits.length >= 10) {
        setPhone(formatPhone(digits));
      }
    }
  }, []);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      navigate("/");
    }
  }, [isAuthenticated, authLoading, navigate]);

  const sendCodeMutation = trpc.smsAuth.sendCode.useMutation({
    onSuccess: (data) => {
      setStep("code");
      setCountdown(180);
      setError("");
      if (data.isExistingUser) {
        setError("이미 가입된 번호입니다. 로그인 페이지로 이동해주세요.");
      }
    },
    onError: (err) => setError(err.message),
  });

  const registerMutation = trpc.smsAuth.register.useMutation({
    onSuccess: () => {
      const params = new URLSearchParams(window.location.search);
      const returnTo = params.get("returnTo") || "/";
      window.location.href = returnTo;
    },
    onError: (err) => {
      if (err.message.includes("이미 가입된")) {
        setError("이미 가입된 전화번호입니다. 로그인해주세요.");
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
    setPhone(formatPhone(e.target.value));
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

  const handleVerifyAndNext = () => {
    setError("");
    if (code.length !== 6) {
      setError("인증번호 6자리를 입력해주세요");
      return;
    }
    setStep("info");
    setError("");
  };

  const handleRegister = () => {
    setError("");
    if (!name.trim()) { setError("이름을 입력해주세요"); return; }
    if (!gender) { setError("성별을 선택해주세요"); return; }
    if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) { setError("생년월일을 입력해주세요 (YYYY-MM-DD)"); return; }
    if (!termsAccepted) { setError("이용약관에 동의해주세요"); return; }
    if (!privacyAccepted) { setError("개인정보처리방침에 동의해주세요"); return; }

    const digits = phone.replace(/\D/g, "");
    registerMutation.mutate({
      phone: digits,
      code,
      name: name.trim(),
      gender: gender as "male" | "female",
      birthDate,
      termsAccepted,
      privacyAccepted,
    });
  };

  const formatCountdown = (s: number) => {
    const min = Math.floor(s / 60);
    const sec = s % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, "");
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  };

  if (authLoading) return null;

  const stepIcons = {
    phone: <Phone className="w-7 h-7 text-primary" />,
    code: <ShieldCheck className="w-7 h-7 text-primary" />,
    info: <UserPlus className="w-7 h-7 text-primary" />,
  };

  const stepTitles = {
    phone: "전화번호 입력",
    code: "인증번호 입력",
    info: "회원정보 입력",
  };

  const stepDescs = {
    phone: "회원가입을 위해 전화번호를 입력해주세요",
    code: `${phone}으로 발송된 인증번호를 입력해주세요`,
    info: "회원가입을 완료하기 위해 정보를 입력해주세요",
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <div className="flex items-center px-5 py-3 bg-background border-b border-line">
        <button
          onClick={() => (step === "phone" ? navigate("/") : setStep(step === "info" ? "code" : "phone"))}
          className="p-1"
        >
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="flex-1 text-center text-base font-bold text-foreground pr-6">회원가입</h1>
      </div>

      {/* Progress */}
      <div className="flex items-center justify-center gap-2 py-4 bg-background">
        {(["phone", "code", "info"] as Step[]).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                step === s
                  ? "bg-primary text-primary-foreground"
                  : ["phone", "code", "info"].indexOf(step) > i
                    ? "bg-primary text-primary-foreground"
                    : "bg-ink-3 text-muted-foreground"
              }`}
            >
              {["phone", "code", "info"].indexOf(step) > i ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
            </div>
            {i < 2 && (
              <div
                className={`w-8 h-0.5 ${["phone", "code", "info"].indexOf(step) > i ? "bg-primary" : "bg-ink-3"}`}
              />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 flex items-start justify-center px-4 pt-4">
        <Card className="w-full max-w-sm border-line-strong bg-card">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center mb-3">
              {stepIcons[step]}
            </div>
            <CardTitle className="text-lg text-foreground">{stepTitles[step]}</CardTitle>
            <CardDescription className="text-sm text-muted-foreground">
              {stepDescs[step]}
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
            {step === "phone" && (
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
                  {sendCodeMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  인증번호 받기
                </Button>
              </>
            )}

            {step === "code" && (
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
                    onKeyDown={(e) => e.key === "Enter" && handleVerifyAndNext()}
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
                  onClick={handleVerifyAndNext}
                  disabled={code.length !== 6}
                  className="w-full bg-primary hover:bg-optic-deep text-primary-foreground font-bold"
                >
                  다음
                </Button>
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => {
                      setStep("phone");
                      setCode("");
                      setError("");
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

            {step === "info" && (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm font-medium text-secondary-foreground mb-1 block">이름</label>
                    <Input
                      placeholder="홍길동"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="bg-ink-3 border-line-strong text-foreground"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-secondary-foreground mb-1 block">성별</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setGender("male")}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          gender === "male"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-ink-3 text-secondary-foreground border-line-strong hover:border-primary/50"
                        }`}
                      >
                        남성
                      </button>
                      <button
                        onClick={() => setGender("female")}
                        className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                          gender === "female"
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-ink-3 text-secondary-foreground border-line-strong hover:border-primary/50"
                        }`}
                      >
                        여성
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-secondary-foreground mb-1 block">생년월일</label>
                    <Input
                      type="text"
                      inputMode="numeric"
                      placeholder="1990-01-01"
                      value={birthDate}
                      onChange={(e) => setBirthDate(formatBirthDate(e.target.value))}
                      maxLength={10}
                      className="bg-ink-3 border-line-strong text-foreground"
                    />
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-line">
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="terms"
                      checked={termsAccepted}
                      onCheckedChange={(v) => setTermsAccepted(!!v)}
                      className="mt-0.5"
                    />
                    <label htmlFor="terms" className="text-sm text-foreground leading-tight cursor-pointer">
                      <span className="font-medium">[필수]</span>{" "}
                      <a href="/terms" target="_blank" className="text-primary underline hover:text-optic-deep">
                        이용약관
                      </a>
                      에 동의합니다
                    </label>
                  </div>
                  <div className="flex items-start gap-3">
                    <Checkbox
                      id="privacy"
                      checked={privacyAccepted}
                      onCheckedChange={(v) => setPrivacyAccepted(!!v)}
                      className="mt-0.5"
                    />
                    <label htmlFor="privacy" className="text-sm text-foreground leading-tight cursor-pointer">
                      <span className="font-medium">[필수]</span>{" "}
                      <a href="/privacy" target="_blank" className="text-primary underline hover:text-optic-deep">
                        개인정보처리방침
                      </a>
                      에 동의합니다
                    </label>
                  </div>
                </div>

                {error && <p className="text-sm text-destructive text-center">{error}</p>}
                <Button
                  onClick={handleRegister}
                  disabled={registerMutation.isPending || !name || !gender || !birthDate || !termsAccepted || !privacyAccepted}
                  className="w-full bg-primary hover:bg-optic-deep text-primary-foreground font-bold"
                >
                  {registerMutation.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                  가입 완료
                </Button>
              </>
            )}

            {step !== "info" && (
              <div className="pt-2 border-t border-line text-center">
                <p className="text-sm text-muted-foreground">
                  이미 회원이신가요?{" "}
                  <button
                    onClick={() => {
                      const params = new URLSearchParams(window.location.search);
                      const returnTo = params.get("returnTo");
                      navigate(returnTo ? `/login?returnTo=${encodeURIComponent(returnTo)}` : "/login");
                    }}
                    className="text-primary font-semibold hover:underline"
                  >
                    로그인
                  </button>
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
