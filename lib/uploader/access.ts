import { ApiError } from "@/lib/api/http";
import {
  requireSessionAccess,
  validateCsrf,
  type SessionAccess
} from "@/lib/auth/session";

export type UploaderAccess = SessionAccess & {
  uploaderProfile: NonNullable<SessionAccess["uploaderProfile"]>;
};

export async function requireUploaderAccess(request: Request, write = false) {
  const access = await requireSessionAccess(request);
  if (write) {
    validateCsrf(request, access);
  }

  if (
    !access.roles.includes("uploader") ||
    !access.uploaderProfile ||
    access.uploaderProfile.status !== "active"
  ) {
    throw new ApiError(403, "FORBIDDEN", "当前账号没有可用的上传者权限。 ");
  }

  return access as UploaderAccess;
}
