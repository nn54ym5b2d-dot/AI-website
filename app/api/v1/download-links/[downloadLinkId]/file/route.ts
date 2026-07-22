import { NextResponse } from "next/server";
import { apiErrorResponse, createRequestId } from "@/lib/api/http";
import { requireSessionAccess } from "@/lib/auth/session";
import { issueBuyerDownloadRedirect } from "@/lib/downloads/service";

type Props = { params: Promise<{ downloadLinkId: string }> };

export async function GET(request: Request, { params }: Props) {
  const requestId = createRequestId();
  try {
    const access = await requireSessionAccess(request);
    const { downloadLinkId } = await params;
    const signed = await issueBuyerDownloadRedirect(access, downloadLinkId, request);
    const response = NextResponse.redirect(signed.location, 302);
    response.headers.set("cache-control", "private, no-store");
    response.headers.set("x-download-url-expires-at", signed.expiresAt.toISOString());
    return response;
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
