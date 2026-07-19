import { ApiError } from "@/lib/api/http";

type StoredPublicPreview = {
  cosBucket: string;
  cosRegion: string;
  cosObjectKey: string;
};

const LOCAL_BUCKET = "local-watermarked-previews";
const LOCAL_OBJECT_KEY = /^t010\/([0-9a-f]{8}-[0-9a-f-]{27}\.png)$/;

export function resolvePublicPreviewUrl(file: StoredPublicPreview) {
  if (file.cosBucket !== LOCAL_BUCKET || file.cosRegion !== "local") {
    throw new ApiError(503, "UPSTREAM_UNAVAILABLE", "素材预览暂时不可用。 ");
  }

  const match = LOCAL_OBJECT_KEY.exec(file.cosObjectKey);
  if (!match) {
    throw new ApiError(503, "UPSTREAM_UNAVAILABLE", "素材预览暂时不可用。 ");
  }

  return `/material-previews/${match[1]}`;
}
