/*
 * MyPage — PicklePlay Design System v1.0
 * 다크 테마, Optic Yellow 액센트
 */
import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronLeft, User, Edit3, Check, X, Trophy, Calendar, Phone,
  ChevronRight, Loader2, LogOut, FileText, Shield,
} from "lucide-react";
import { useLocation } from "wouter";

const statusLabels: Record<string, { label: string; color: string }> = {
  pending: { label: "입금대기", color: "bg-primary/20 text-primary" },
  confirmed: { label: "참가확정", color: "bg-primary/20 text-primary" },
  cancelled: { label: "취소됨", color: "bg-destructive/20 text-destructive" },
};

const paymentLabels: Record<string, { label: string; color: string }> = {
  unpaid: { label: "미입금", color: "bg-primary/20 text-primary" },
  paid: { label: "입금완료", color: "bg-primary/20 text-primary" },
  refunded: { label: "환불", color: "bg-muted text-muted-foreground" },
};

export default function MyPage() {
  const { user, isAuthenticated, loading: authLoading, logout } = useAuth();
  const [, navigate] = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editGender, setEditGender] = useState<"male" | "female">("male");
  const [editBirthDate, setEditBirthDate] = useState("");

  const profileQuery = trpc.user.profile.useQuery(undefined, { enabled: isAuthenticated });
  const registrationsQuery = trpc.registration.myRegistrations.useQuery(undefined, { enabled: isAuthenticated });

  const updateProfileMutation = trpc.user.updateProfile.useMutation({
    onSuccess: () => {
      toast.success("프로필이 수정되었습니다");
      profileQuery.refetch();
      setIsEditing(false);
    },
    onError: (err) => toast.error(err.message || "프로필 수정에 실패했습니다"),
  });

  useEffect(() => {
    if (profileQuery.data) {
      setEditName(profileQuery.data.name || "");
      setEditGender(profileQuery.data.gender || "male");
      setEditBirthDate(profileQuery.data.birthDate || "");
    }
  }, [profileQuery.data]);

  const handleSaveProfile = () => {
    updateProfileMutation.mutate({ name: editName, gender: editGender, birthDate: editBirthDate });
  };

  const formatBirthDate = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 8);
    if (digits.length <= 4) return digits;
    if (digits.length <= 6) return `${digits.slice(0, 4)}-${digits.slice(4)}`;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6)}`;
  };

  const formatPhone = (phone: string | null | undefined) => {
    if (!phone) return "-";
    if (phone.length === 11) return `${phone.slice(0, 3)}-${phone.slice(3, 7)}-${phone.slice(7)}`;
    return phone;
  };

  if (authLoading) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="bg-background min-h-screen">
        <AppHeader />
        <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
          <div className="w-16 h-16 rounded-full bg-ink-3 flex items-center justify-center mb-4">
            <User className="w-8 h-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-bold text-foreground mb-2">로그인이 필요합니다</h2>
          <p className="text-sm text-muted-foreground mb-6">마이페이지를 이용하려면 로그인해주세요.</p>
          <Button
            onClick={() => navigate("/login?returnTo=/mypage")}
            className="bg-primary hover:bg-optic-deep text-primary-foreground"
          >
            로그인하기
          </Button>
        </div>
      </div>
    );
  }

  const profile = profileQuery.data;
  const registrations = registrationsQuery.data ?? [];

  return (
    <div className="bg-background min-h-screen pb-24">
      <AppHeader />

      {/* Back button */}
      <div className="px-4 pt-1 pb-3 flex items-center gap-2">
        <button onClick={() => navigate("/")} className="w-8 h-8 rounded-full bg-card border border-line-strong flex items-center justify-center">
          <ChevronLeft className="w-4 h-4 text-foreground" />
        </button>
        <h1 className="text-lg font-extrabold text-foreground">마이페이지</h1>
      </div>

      <div className="px-4 space-y-4">
        {/* Profile Card */}
        <Card className="border-line-strong bg-card rounded-2xl overflow-hidden">
          <div className="bg-gradient-to-r from-ink to-ink-3 px-5 py-4 flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-xl">
              {profile?.name?.charAt(0) || "?"}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-foreground font-bold text-lg truncate">{profile?.name || "이름 없음"}</h2>
              <p className="text-muted-foreground text-sm">{formatPhone(profile?.phone)}</p>
            </div>
            {!isEditing && (
              <button onClick={() => setIsEditing(true)} className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                <Edit3 className="w-4 h-4 text-foreground" />
              </button>
            )}
          </div>

          <CardContent className="p-5">
            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-secondary-foreground mb-1 block">이름</label>
                  <Input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="이름을 입력해주세요" className="bg-ink-3 border-line-strong text-foreground" />
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-foreground mb-1 block">성별</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => setEditGender("male")}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        editGender === "male" ? "bg-primary text-primary-foreground border-primary" : "bg-ink-3 text-secondary-foreground border-line-strong hover:border-primary/50"
                      }`}
                    >남성</button>
                    <button
                      onClick={() => setEditGender("female")}
                      className={`py-2.5 rounded-lg border text-sm font-medium transition-colors ${
                        editGender === "female" ? "bg-primary text-primary-foreground border-primary" : "bg-ink-3 text-secondary-foreground border-line-strong hover:border-primary/50"
                      }`}
                    >여성</button>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-secondary-foreground mb-1 block">생년월일</label>
                  <Input type="text" inputMode="numeric" placeholder="1990-01-01" value={editBirthDate} onChange={(e) => setEditBirthDate(formatBirthDate(e.target.value))} maxLength={10} className="bg-ink-3 border-line-strong text-foreground" />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveProfile} disabled={updateProfileMutation.isPending || !editName} className="flex-1 bg-primary hover:bg-optic-deep text-primary-foreground">
                    {updateProfileMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Check className="w-4 h-4 mr-2" />}
                    저장
                  </Button>
                  <Button
                    onClick={() => {
                      setIsEditing(false);
                      if (profile) { setEditName(profile.name || ""); setEditGender(profile.gender || "male"); setEditBirthDate(profile.birthDate || ""); }
                    }}
                    variant="outline"
                    className="flex-1 border-line-strong text-secondary-foreground"
                  >
                    <X className="w-4 h-4 mr-2" /> 취소
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">성별</span>
                  <span className="text-sm font-medium text-foreground">
                    {profile?.gender === "male" ? "남성" : profile?.gender === "female" ? "여성" : "-"}
                  </span>
                </div>
                <div className="border-t border-line" />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">생년월일</span>
                  <span className="text-sm font-medium text-foreground">{profile?.birthDate || "-"}</span>
                </div>
                <div className="border-t border-line" />
                <div className="flex items-center justify-between py-1">
                  <span className="text-sm text-muted-foreground">가입일</span>
                  <span className="text-sm font-medium text-foreground">
                    {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString("ko-KR") : "-"}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Registration History */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-bold text-foreground flex items-center gap-2">
              <Trophy className="w-4 h-4 text-primary" strokeWidth={2.2} />
              대회 접수 내역
            </h3>
            <span className="text-xs text-muted-foreground">{registrations.length}건</span>
          </div>

          {registrationsQuery.isLoading ? (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
            </div>
          ) : registrations.length === 0 ? (
            <Card className="border-line-strong bg-card rounded-2xl">
              <CardContent className="py-10 text-center">
                <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-3" strokeWidth={2.2} />
                <p className="text-sm text-muted-foreground mb-4">아직 접수한 대회가 없습니다</p>
                <Button onClick={() => navigate("/tournament")} variant="outline" size="sm" className="text-primary border-primary">
                  대회 둘러보기
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {registrations.map((reg: any) => {
                const status = statusLabels[reg.status] || statusLabels.pending;
                const payment = paymentLabels[reg.paymentStatus] || paymentLabels.unpaid;
                return (
                  <Card key={reg.id} className="border-line-strong bg-card rounded-2xl cursor-pointer hover:border-primary/40 transition-colors" onClick={() => navigate(`/tournament/${reg.tournamentId}`)}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-foreground truncate">
                            {reg.tournamentName || `대회 #${reg.tournamentId}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">접수번호: {reg.registrationNumber}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0 mt-1" />
                      </div>

                      <div className="flex items-center gap-2 mb-3">
                        <Badge className={`${status.color} text-xs px-2 py-0.5 rounded-full font-medium`}>{status.label}</Badge>
                        <Badge className={`${payment.color} text-xs px-2 py-0.5 rounded-full font-medium`}>{payment.label}</Badge>
                        {reg.eventType && (
                          <Badge variant="outline" className="text-xs px-2 py-0.5 rounded-full border-line-strong text-muted-foreground">
                            {reg.eventType === "doubles" ? "복식" : "단식"}
                          </Badge>
                        )}
                      </div>

                      <div className="bg-ink-3 rounded-lg p-2.5">
                        {reg.players?.map((p: any, idx: number) => (
                          <div key={idx} className="flex items-center gap-2 text-xs text-secondary-foreground">
                            <User className="w-3 h-3" />
                            <span className="font-medium">{p.name}</span>
                            <span className="text-muted-foreground">|</span>
                            <span>{p.birthDate}</span>
                            <span className="text-muted-foreground">|</span>
                            <span>{p.phone}</span>
                          </div>
                        ))}
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        {new Date(reg.createdAt).toLocaleDateString("ko-KR", {
                          year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick Links */}
        <div className="space-y-2 pt-2">
          <button onClick={() => navigate("/terms")} className="w-full flex items-center gap-3 bg-card border border-line-strong rounded-xl px-4 py-3">
            <FileText className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-secondary-foreground flex-1 text-left">이용약관</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button onClick={() => navigate("/privacy")} className="w-full flex items-center gap-3 bg-card border border-line-strong rounded-xl px-4 py-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm text-secondary-foreground flex-1 text-left">개인정보처리방침</span>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={async () => { await logout(); navigate("/"); }}
            className="w-full flex items-center gap-3 bg-card border border-line-strong rounded-xl px-4 py-3"
          >
            <LogOut className="w-4 h-4 text-destructive" />
            <span className="text-sm text-destructive flex-1 text-left">로그아웃</span>
          </button>
        </div>
      </div>
    </div>
  );
}
