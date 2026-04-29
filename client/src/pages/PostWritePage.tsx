import { useState, useRef, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import NicknameModal from "@/components/NicknameModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, ImagePlus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";

const MAX_IMAGES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"];

interface UploadedImage {
  id?: number;
  imageUrl: string;
  thumbnailUrl: string;
  fileKey: string;
  thumbnailFileKey: string;
  width?: number;
  height?: number;
}

export default function PostWritePage() {
  const params = useParams<{ id: string }>();
  const editId = params.id ? Number(params.id) : null;
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [nicknameModalOpen, setNicknameModalOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const utils = trpc.useUtils();

  // Load existing post for editing
  const editQuery = trpc.community.post.detail.useQuery(
    { id: editId! },
    { enabled: !!editId }
  );

  useEffect(() => {
    if (editQuery.data) {
      setTitle(editQuery.data.title);
      setContent(editQuery.data.content);
      if (editQuery.data.images) {
        setImages(editQuery.data.images.map((img: any) => ({
          id: img.id,
          imageUrl: img.imageUrl,
          thumbnailUrl: img.thumbnailUrl,
          fileKey: img.fileKey || "",
          thumbnailFileKey: img.thumbnailFileKey || "",
          width: img.width,
          height: img.height,
        })));
      }
    }
  }, [editQuery.data]);

  // Fixed: community.image.upload (not community.post.uploadImage)
  const uploadMutation = trpc.community.image.upload.useMutation();

  const createMutation = trpc.community.post.create.useMutation({
    onSuccess: (data) => {
      toast.success("게시글이 작성되었습니다");
      utils.community.post.list.invalidate();
      navigate(`/social/post/${data.id}`);
    },
    onError: (err) => {
      toast.error(err.message);
      setSubmitting(false);
    },
  });

  const updateMutation = trpc.community.post.update.useMutation({
    onSuccess: () => {
      toast.success("게시글이 수정되었습니다");
      utils.community.post.detail.invalidate({ id: editId! });
      utils.community.post.list.invalidate();
      navigate(`/social/post/${editId}`);
    },
    onError: (err) => {
      toast.error(err.message);
      setSubmitting(false);
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (images.length + files.length > MAX_IMAGES) {
      toast.error(`이미지는 최대 ${MAX_IMAGES}장까지 첨부할 수 있습니다`);
      return;
    }

    setUploading(true);
    for (const file of files) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`지원하지 않는 파일 형식입니다: ${file.name}`);
        continue;
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error(`파일 크기가 10MB를 초과합니다: ${file.name}`);
        continue;
      }

      try {
        const base64Data = await fileToBase64(file);
        // Fixed: field name is 'base64' (not 'fileData')
        const result = await uploadMutation.mutateAsync({
          base64: base64Data,
          mimeType: file.type,
          fileName: file.name,
        });
        setImages((prev) => [...prev, result]);
      } catch (err: any) {
        toast.error(`업로드 실패: ${file.name}`);
      }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = () => {
    if (!user) { window.location.href = getLoginUrl("/social/write"); return; }
    if (!user.nickname) { setNicknameModalOpen(true); return; }
    if (!title.trim()) { toast.error("제목을 입력해주세요"); return; }
    if (!content.trim()) { toast.error("내용을 입력해주세요"); return; }

    setSubmitting(true);
    const imageData = images.map((img, idx) => ({
      imageUrl: img.imageUrl,
      thumbnailUrl: img.thumbnailUrl,
      fileKey: img.fileKey,
      thumbnailFileKey: img.thumbnailFileKey,
      width: img.width ?? 0,
      height: img.height ?? 0,
      sortOrder: idx,
    }));

    if (editId) {
      updateMutation.mutate({ id: editId, title: title.trim(), content: content.trim(), images: imageData });
    } else {
      createMutation.mutate({ title: title.trim(), content: content.trim(), images: imageData });
    }
  };

  // Redirect if not logged in
  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen text-muted-foreground">
        <p>로그인이 필요합니다</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/95 backdrop-blur-sm border-b border-line">
        <div className="flex items-center justify-between px-2 h-12">
          <button onClick={() => navigate(-1 as any)} className="p-2 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <h2 className="text-sm font-bold text-foreground">
            {editId ? "게시글 수정" : "글쓰기"}
          </h2>
          <Button
            onClick={handleSubmit}
            size="sm"
            className="h-8 px-4 text-xs font-bold"
            disabled={submitting || !title.trim() || !content.trim()}
          >
            {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : editId ? "수정" : "등록"}
          </Button>
        </div>
      </div>

      {/* Form */}
      <div className="flex-1 px-4 pt-4 pb-20">
        <Input
          placeholder="제목을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 bg-transparent border-0 border-b border-line rounded-none text-base font-semibold px-0 focus-visible:ring-0 focus-visible:border-primary"
          maxLength={200}
        />

        <Textarea
          placeholder="내용을 입력하세요"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="mt-4 min-h-[200px] bg-transparent border-0 text-sm resize-none px-0 focus-visible:ring-0"
          rows={10}
        />

        {/* Image previews */}
        {images.length > 0 && (
          <div className="flex gap-2 mt-4 overflow-x-auto pb-2 no-scrollbar">
            {images.map((img, idx) => (
              <div key={idx} className="relative shrink-0 w-20 h-20 rounded-xl overflow-hidden bg-muted">
                <img src={img.thumbnailUrl || img.imageUrl} alt="" className="w-full h-full object-cover" />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Image upload button */}
        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || images.length >= MAX_IMAGES}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors disabled:opacity-40"
          >
            {uploading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : (
              <ImagePlus className="w-5 h-5" />
            )}
            <span>사진 {images.length}/{MAX_IMAGES}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
            multiple
            onChange={handleImageSelect}
            className="hidden"
          />
        </div>
      </div>

      {/* Nickname Modal */}
      <NicknameModal
        open={nicknameModalOpen}
        onClose={() => setNicknameModalOpen(false)}
        onSuccess={() => setNicknameModalOpen(false)}
      />
    </div>
  );
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // Remove data:image/...;base64, prefix
      const base64 = result.split(",")[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}
