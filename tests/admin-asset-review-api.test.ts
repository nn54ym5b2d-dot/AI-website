import assert from "node:assert/strict";
import test from "node:test";

import { GET as getCsrf } from "../app/api/v1/auth/csrf/route.ts";
import { GET as listAdminAssets } from "../app/api/v1/admin/assets/route.ts";
import { PATCH as patchAdminAsset } from "../app/api/v1/admin/assets/[assetId]/route.ts";
import { POST as reviewAdminAsset } from "../app/api/v1/admin/assets/[assetId]/review/route.ts";
import { POST as updateListing } from "../app/api/v1/admin/assets/[assetId]/listing/route.ts";
import { POST as createCertificateUpload } from "../app/api/v1/admin/certifications/[certificationId]/file-uploads/route.ts";
import { POST as completeCertificateUpload } from "../app/api/v1/admin/certifications/[certificationId]/file-uploads/[uploadId]/complete/route.ts";
import { POST as verifyCertification } from "../app/api/v1/admin/certifications/[certificationId]/verify/route.ts";
import { GET as viewSensitiveFile } from "../app/api/v1/admin/files/[fileId]/view/route.ts";
import { GET as listAuditLogs } from "../app/api/v1/admin/audit-logs/route.ts";
import { GET as listPublicAssets } from "../app/api/v1/assets/route.ts";
import { createSession } from "../lib/auth/session.ts";
import { getPrisma } from "../lib/db/prisma.ts";

const shouldRun = process.env.RUN_DB_TESTS === "1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const personAssetId = "11000000-0000-4000-8000-000000000001";
const objectAssetId = "11000000-0000-4000-8000-000000000002";

type Envelope<T> = { data: T; error?: { code: string; message: string } };

function request(path: string, headers: Record<string, string> = {}) {
  return new Request(`${appUrl}${path}`, { headers });
}

function jsonRequest(path: string, method: "POST" | "PATCH", body: unknown, headers: Record<string, string>) {
  return new Request(`${appUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

async function json<T>(response: Response) {
  return (await response.json()) as Envelope<T>;
}

async function sessionFor(email: string) {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
  const session = await createSession(user.id);
  const cookie = `yuansu_session=${encodeURIComponent(session.token)}`;
  const csrfResponse = await getCsrf(request("/api/v1/auth/csrf", { cookie }));
  const csrfToken = (await json<{ csrfToken: string }>(csrfResponse)).data.csrfToken;
  return { cookie, csrfToken };
}

function writeHeaders(session: { cookie: string; csrfToken: string }) {
  return { cookie: session.cookie, origin: appUrl, "x-csrf-token": session.csrfToken };
}

test("T012 后台审核、认证、上架、退款队列、敏感文件和审计日志形成数据库闭环", { skip: !shouldRun }, async (t) => {
  t.after(async () => {
    await getPrisma().asset.update({
      where: { id: personAssetId },
      data: { listingStatus: "unlisted", listedAt: null }
    });
  });

  const operator = await sessionFor("operator@example.test");
  const finance = await sessionFor("finance@example.test");
  const observer = await sessionFor("observer@example.test");

  const unauthenticated = await listAdminAssets(request("/api/v1/admin/assets"));
  assert.equal(unauthenticated.status, 401);

  const financeList = await listAdminAssets(request("/api/v1/admin/assets", { cookie: finance.cookie }));
  assert.equal(financeList.status, 403);
  const observerList = await listAdminAssets(request("/api/v1/admin/assets", { cookie: observer.cookie }));
  assert.equal(observerList.status, 403);

  const operatorList = await listAdminAssets(request("/api/v1/admin/assets", { cookie: operator.cookie }));
  assert.equal(operatorList.status, 200);
  assert.equal(JSON.stringify(await json<unknown>(operatorList)).includes("cosObjectKey"), false);

  const forbiddenPriceEdit = await patchAdminAsset(
    jsonRequest(`/api/v1/admin/assets/${personAssetId}`, "PATCH", { priceCents: 1 }, writeHeaders(operator)),
    { params: Promise.resolve({ assetId: personAssetId }) }
  );
  assert.equal(forbiddenPriceEdit.status, 422);

  const metadataEdit = await patchAdminAsset(
    jsonRequest(
      `/api/v1/admin/assets/${personAssetId}`,
      "PATCH",
      { title: "T012 已编辑人物素材", category: "人物参考", tags: ["人物", "T012", "人物"] },
      writeHeaders(operator)
    ),
    { params: Promise.resolve({ assetId: personAssetId }) }
  );
  assert.equal(metadataEdit.status, 200);
  assert.deepEqual(
    new Set((await json<{ tags: string[] }>(metadataEdit)).data.tags),
    new Set(["人物", "T012"])
  );

  const financeReview = await reviewAdminAsset(
    jsonRequest(`/api/v1/admin/assets/${personAssetId}/review`, "POST", { decision: "approve" }, writeHeaders(finance)),
    { params: Promise.resolve({ assetId: personAssetId }) }
  );
  assert.equal(financeReview.status, 403);

  const approved = await reviewAdminAsset(
    jsonRequest(`/api/v1/admin/assets/${personAssetId}/review`, "POST", { decision: "approve" }, writeHeaders(operator)),
    { params: Promise.resolve({ assetId: personAssetId }) }
  );
  assert.equal(approved.status, 200);
  const approvedAsset = (await json<{ reviewStatus: string; certificationStatus: string; certification: { id: string } }>(approved)).data;
  assert.equal(approvedAsset.reviewStatus, "approved");
  assert.equal(approvedAsset.certificationStatus, "certifying");
  assert.ok(approvedAsset.certification.id);

  const prematureListing = await updateListing(
    jsonRequest(`/api/v1/admin/assets/${personAssetId}/listing`, "POST", { action: "list" }, writeHeaders(operator)),
    { params: Promise.resolve({ assetId: personAssetId }) }
  );
  assert.equal(prematureListing.status, 409);

  const uploadCreated = await createCertificateUpload(
    jsonRequest(
      `/api/v1/admin/certifications/${approvedAsset.certification.id}/file-uploads`,
      "POST",
      {
        fileType: "certificate_file",
        fileName: "local-certificate.pdf",
        mimeType: "application/pdf",
        sizeBytes: 120000,
        sha256: "e".repeat(64)
      },
      writeHeaders(operator)
    ),
    { params: Promise.resolve({ certificationId: approvedAsset.certification.id }) }
  );
  assert.equal(uploadCreated.status, 201);
  const upload = (await json<{ uploadId: string; providerMode: string }>(uploadCreated)).data;
  assert.equal(upload.providerMode, "metadata_only");

  const completed = await completeCertificateUpload(
    jsonRequest(
      `/api/v1/admin/certifications/${approvedAsset.certification.id}/file-uploads/${upload.uploadId}/complete`,
      "POST",
      {},
      writeHeaders(operator)
    ),
    { params: Promise.resolve({ certificationId: approvedAsset.certification.id, uploadId: upload.uploadId }) }
  );
  assert.equal(completed.status, 200);
  const certificateFileId = (await json<{ fileId: string }>(completed)).data.fileId;

  const certified = await verifyCertification(
    jsonRequest(
      `/api/v1/admin/certifications/${approvedAsset.certification.id}/verify`,
      "POST",
      {
        status: "certified",
        governmentSiteName: "本地测试认证来源（非真实机构）",
        certificateNo: "LOCAL-T012-CERT-001",
        credential: "LOCAL-T012-CREDENTIAL",
        certificateFileId,
        issuedAt: "2026-07-20T00:00:00.000Z",
        notes: "自动化测试记录"
      },
      writeHeaders(operator)
    ),
    { params: Promise.resolve({ certificationId: approvedAsset.certification.id }) }
  );
  assert.equal(certified.status, 200);
  assert.equal((await json<{ status: string }>(certified)).data.status, "certified");

  const listed = await updateListing(
    jsonRequest(`/api/v1/admin/assets/${personAssetId}/listing`, "POST", { action: "list" }, writeHeaders(operator)),
    { params: Promise.resolve({ assetId: personAssetId }) }
  );
  assert.equal(listed.status, 200);
  assert.equal((await json<{ listingStatus: string }>(listed)).data.listingStatus, "listed");

  const publicList = await listPublicAssets(request("/api/v1/assets?q=T012%20%E5%B7%B2%E7%BC%96%E8%BE%91"));
  assert.equal(publicList.status, 200);
  const publicPayload = await json<Array<{ id: string }>>(publicList);
  assert.ok(publicPayload.data.some((asset) => asset.id === personAssetId));

  const proofFile = await getPrisma().assetFile.findFirstOrThrow({ where: { assetId: personAssetId, fileType: "person_proof" } });
  const sensitiveView = await viewSensitiveFile(
    request(`/api/v1/admin/files/${proofFile.id}/view`, { cookie: operator.cookie }),
    { params: Promise.resolve({ fileId: proofFile.id }) }
  );
  assert.equal(sensitiveView.status, 302);
  const location = sensitiveView.headers.get("location") ?? "";
  assert.match(location, /\/local-view\?token=/);
  assert.equal(location.includes(proofFile.cosObjectKey), false);

  const rejected = await reviewAdminAsset(
    jsonRequest(
      `/api/v1/admin/assets/${objectAssetId}/review`,
      "POST",
      { decision: "reject", reason: "本地测试：素材信息不完整" },
      writeHeaders(operator)
    ),
    { params: Promise.resolve({ assetId: objectAssetId }) }
  );
  assert.equal(rejected.status, 200);
  const rejectedData = (await json<{ reviewStatus: string; certificationRefundRequest: { status: string; amountCents: number } }>(rejected)).data;
  assert.equal(rejectedData.reviewStatus, "rejected");
  assert.equal(rejectedData.certificationRefundRequest.status, "pending");
  assert.equal(rejectedData.certificationRefundRequest.amountCents, 1000);

  const auditResponse = await listAuditLogs(request("/api/v1/admin/audit-logs", { cookie: operator.cookie }));
  assert.equal(auditResponse.status, 200);
  const auditPayload = await json<Array<{ action: string }>>(auditResponse);
  const actions = new Set(auditPayload.data.map((entry) => entry.action));
  assert.ok(actions.has("asset.metadata_updated"));
  assert.ok(actions.has("asset.review_approved"));
  assert.ok(actions.has("certification.certified"));
  assert.ok(actions.has("asset.listed"));
  assert.ok(actions.has("sensitive_file.view_requested"));
  assert.ok(actions.has("asset.review_rejected"));
});
