import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface NicknameModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function NicknameModal({ open, onClose, onSuccess }: NicknameModalProps) {
  const [nickname, setNickname] = useState("");
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState<boolean | null>(null);

  const utils = trpc.useUtils();



  const setMutation = trpc.community.nickname.set.useMutation({
    onSuccess: () => {
      toast.success("닉네임이 설정되었습니다");
      utils.auth.me.invalidate();
      onSuccess();
    },
    onError: (err) => {
      toast.error(err.message || "닉네임 설정에 실패했습니다");
    },
  });

  const handleCheck = () => {
    if (nickname.trim().length < 2) {
      toast.error("닉네임은 2자 이상이어야 합니다");
      return;
    }
    if (nickname.trim().length > 20) {
      toast.error("닉네임은 20자 이하여야 합니다");
      return;
    }
    setChecking(true);
    setAvailable(null);
    // nickname.check is a query on the backend, so use fetch instead of mutate
    utils.community.nickname.check.fetch({ nickname: nickname.trim() })
      .then((data) => {
        setAvailable(data.available);
        setChecking(false);
      })
      .catch(() => {
        setChecking(false);
      });
  };

  const handleSubmit = () => {
    if (!available) return;
    setMutation.mutate({ nickname: nickname.trim() });
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="bg-card rounded-2xl w-full max-w-sm p-6 border border-line-strong shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-foreground">닉네임 설정</h3>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>

        <p className="text-xs text-muted-foreground mb-4">
          커뮤니티에서 사용할 닉네임을 설정해주세요.
          <br />2~20자, 한글/영문/숫자 사용 가능합니다.
        </p>

        <div className="flex gap-2 mb-3">
          <Input
            placeholder="닉네임 입력"
            value={nickname}
            onChange={(e) => {
              setNickname(e.target.value);
              setAvailable(null);
            }}
            className="h-10 bg-muted border-0 text-sm flex-1"
            maxLength={20}
          />
          <Button
            onClick={handleCheck}
            variant="outline"
            size="sm"
            className="h-10 px-3 text-xs shrink-0"
            disabled={checking || nickname.trim().length < 2}
          >
            {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : "중복확인"}
          </Button>
        </div>

        {available !== null && (
          <p className={`text-xs mb-3 ${available ? "text-green-400" : "text-red-400"}`}>
            {available ? (
              <span className="flex items-center gap-1">
                <Check className="w-3 h-3" /> 사용 가능한 닉네임입니다
              </span>
            ) : (
              "이미 사용 중인 닉네임입니다"
            )}
          </p>
        )}

        <Button
          onClick={handleSubmit}
          className="w-full h-10 text-sm font-bold"
          disabled={!available || setMutation.isPending}
        >
          {setMutation.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
          ) : null}
          설정 완료
        </Button>
      </div>
    </div>
  );
}
