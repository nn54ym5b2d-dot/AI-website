import assert from "node:assert/strict";
import test from "node:test";

import { GET as getCsrf } from "../app/api/v1/auth/csrf/route.ts";
import {
  GET as listUploaderAssets,
  POST as createUploaderAsset
} from "../app/api/v1/uploader/assets/route.ts";
import { PATCH as updateUploaderAsset } from "../app/api/v1/uploader/assets/[assetId]/route.ts";
import { POST as createUploadIntent } from "../app/api/v1/uploader/assets/[assetId]/file-uploads/route.ts";
import { POST as completeUpload } from "../app/api/v1/uploader/assets/[assetId]/file-uploads/[uploadId]/complete/route.ts";
import { POST as runProcessingJob } from "../app/api/v1/uploader/assets/[assetId]/processing-jobs/[jobId]/run/route.ts";
import { POST as submitAsset } from "../app/api/v1/uploader/assets/[assetId]/submit/route.ts";
import { createSession } from "../lib/auth/session.ts";
import { getPrisma } from "../lib/db/prisma.ts";

const shouldRun = process.env.RUN_DB_TESTS === "1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type ApiEnvelope<T> = { data: T; error?: { code: string; message: string } };

function request(path: string, headers: Record<string, string> = {}) {
  return new Request(`${appUrl}${path}`, { headers });
}

function jsonRequest(
  path: string,
  method: "POST" | "PATCH",
  body: unknown,
  headers: Record<string, string> = {}
) {
  return new Request(`${appUrl}${path}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
}

async function json<T>(response: Response) {
  return (await response.json()) as ApiEnvelope<T>;
}

async function sessionFor(email: string) {
  const user = await getPrisma().user.findUniqueOrThrow({ where: { email } });
  const session = await createSession(user.id);
  const cookie = `yuansu_session=${encodeURIComponent(session.token)}`;
  const csrfResponse = await getCsrf(request("/api/v1/auth/csrf", { cookie }));
  assert.equal(csrfResponse.status, 200);
  const csrfToken = (await json<{ csrfToken: string }>(csrfResponse)).data.csrfToken;
  return { user, cookie, csrfToken };
}

function writeHeaders(session: { cookie: string; csrfToken: string }, extra = {}) {
  return {
    cookie: session.cookie,
    origin: appUrl,
    "x-csrf-token": session.csrfToken,
    ...extra
  };
}

test("T011 上传 API 跑通两套表单规则、幂等完成、独立衍生对象与认证费待支付状态", { skip: !shouldRun }, async () => {
  const uploader = await sessionFor("asset-uploader@example.test");

  const unauthenticated = await listUploaderAssets(request("/api/v1/uploader/assets"));
  assert.equal(unauthenticated.status, 401);

  const buyer = await sessionFor("buyer@example.test");
  const buyerCreate = await createUploaderAsset(
    jsonRequest(
      "/api/v1/uploader/assets",
      "POST",
      { type: "person", title: "无权限人物素材", tags: [] },
      writeHeaders(buyer)
    )
  );
  assert.equal(buyerCreate.status, 403);

  const personResponse = await createUploaderAsset(
    jsonRequest(
      "/api/v1/uploader/assets",
      "POST",
      {
        type: "person",
        title: "T011 人物素材草稿",
        description: "本地测试，不代表真实素材。",
        tags: ["人物", "自然光", "人物"]
      },
      writeHeaders(uploader)
    )
  );
  assert.equal(personResponse.status, 201);
  const person = (await json<{ id: string; priceCents: number; tags: string[] }>(personResponse)).data;
  assert.equal(person.priceCents, 5000);
  assert.deepEqual(new Set(person.tags), new Set(["人物", "自然光"]));

  const updatedResponse = await updateUploaderAsset(
    jsonRequest(
      `/api/v1/uploader/assets/${person.id}`,
      "PATCH",
      { title: "T011 人物素材已编辑", tags: ["人物", "多角度"] },
      writeHeaders(uploader)
    ),
    { params: Promise.resolve({ assetId: person.id }) }
  );
  assert.equal(updatedResponse.status, 200);
  assert.equal((await json<{ title: string }>(updatedResponse)).data.title, "T011 人物素材已编辑");

  const originalIntentResponse = await createUploadIntent(
    jsonRequest(
      `/api/v1/uploader/assets/${person.id}/file-uploads`,
      "POST",
      {
        fileType: "original",
        fileName: "person-front.png",
        mimeType: "image/png",
        sizeBytes: 4_000_000,
        sha256: "a".repeat(64)
      },
      writeHeaders(uploader)
    ),
    { params: Promise.resolve({ assetId: person.id }) }
  );
  assert.equal(originalIntentResponse.status, 201);
  const originalIntent = (
    await json<{
      uploadId: string;
      provider: string;
      providerMode: string;
      uploadUrl: string;
      providerDisclosure: string;
    }>(originalIntentResponse)
  ).data;
  assert.equal(originalIntent.provider, "local_test");
  assert.equal(originalIntent.providerMode, "metadata_only");
  assert.match(originalIntent.uploadUrl, /^local-test:\/\/upload\/[0-9a-f-]{36}$/);
  assert.match(originalIntent.providerDisclosure, /不会上传文件正文/);
  const serializedIntent = JSON.stringify(originalIntent);
  assert.equal(serializedIntent.includes("objectKey"), false);
  assert.equal(serializedIntent.includes("bucket"), false);

  const completeRequest = () =>
    completeUpload(
      jsonRequest(
        `/api/v1/uploader/assets/${person.id}/file-uploads/${originalIntent.uploadId}/complete`,
        "POST",
        {},
        writeHeaders(uploader)
      ),
      { params: Promise.resolve({ assetId: person.id, uploadId: originalIntent.uploadId }) }
    );
  const firstComplete = await completeRequest();
  assert.equal(firstComplete.status, 200);
  const firstCompleteData = (
    await json<{
      fileId: string;
      processingJobId: string;
      repeatedCompletion: boolean;
    }>(firstComplete)
  ).data;
  assert.equal(firstCompleteData.repeatedCompletion, false);

  const repeatedComplete = await completeRequest();
  assert.equal(repeatedComplete.status, 200);
  const repeatedCompleteData = (
    await json<{ fileId: string; processingJobId: string; repeatedCompletion: boolean }>(
      repeatedComplete
    )
  ).data;
  assert.equal(repeatedCompleteData.fileId, firstCompleteData.fileId);
  assert.equal(repeatedCompleteData.processingJobId, firstCompleteData.processingJobId);
  assert.equal(repeatedCompleteData.repeatedCompletion, true);
  assert.equal(
    await getPrisma().assetFile.count({
      where: { assetId: person.id, fileType: "original", deletedAt: null }
    }),
    1
  );

  const intentRow = await getPrisma().uploadIntent.findUniqueOrThrow({
    where: { id: originalIntent.uploadId }
  });
  assert.notEqual(intentRow.stagingObjectKey, intentRow.finalObjectKey);
  assert.equal(intentRow.status, "completed");
  assert.equal(intentRow.assetFileId, firstCompleteData.fileId);

  const submitBeforeProcessing = await submitAsset(
    jsonRequest(
      `/api/v1/uploader/assets/${person.id}/submit`,
      "POST",
      {},
      writeHeaders(uploader, { "idempotency-key": "t011-before-processing" })
    ),
    { params: Promise.resolve({ assetId: person.id }) }
  );
  assert.equal(submitBeforeProcessing.status, 422);
  assert.equal((await json<never>(submitBeforeProcessing)).error?.code, "ASSET_FILES_INCOMPLETE");

  const processResponse = await runProcessingJob(
    jsonRequest(
      `/api/v1/uploader/assets/${person.id}/processing-jobs/${firstCompleteData.processingJobId}/run`,
      "POST",
      {},
      writeHeaders(uploader)
    ),
    { params: Promise.resolve({ assetId: person.id, jobId: firstCompleteData.processingJobId }) }
  );
  assert.equal(processResponse.status, 200);
  const processData = (
    await json<{ derivatives: Array<{ id: string; fileType: string; sourceFileId: string }> }>(
      processResponse
    )
  ).data;
  assert.deepEqual(
    new Set(processData.derivatives.map((file) => file.fileType)),
    new Set(["preview", "thumbnail"])
  );
  assert.ok(processData.derivatives.every((file) => file.sourceFileId === firstCompleteData.fileId));

  const allFiles = await getPrisma().assetFile.findMany({ where: { assetId: person.id } });
  const original = allFiles.find((file) => file.id === firstCompleteData.fileId);
  const derivatives = allFiles.filter((file) => ["preview", "thumbnail"].includes(file.fileType));
  assert.equal(original?.accessScope, "private");
  assert.ok(derivatives.every((file) => file.accessScope === "public_preview"));
  assert.ok(derivatives.every((file) => file.cosObjectKey !== original?.cosObjectKey));
  assert.notEqual(derivatives[0]?.cosObjectKey, derivatives[1]?.cosObjectKey);
  assert.ok(
    derivatives.every((file) => {
      const metadata = file.metadata as { processingMode?: string; sourceFileId?: string };
      return metadata.processingMode === "metadata_only" && metadata.sourceFileId === original?.id;
    })
  );

  const submitWithoutProof = await submitAsset(
    jsonRequest(
      `/api/v1/uploader/assets/${person.id}/submit`,
      "POST",
      {},
      writeHeaders(uploader, { "idempotency-key": "t011-missing-proof" })
    ),
    { params: Promise.resolve({ assetId: person.id }) }
  );
  assert.equal(submitWithoutProof.status, 422);
  assert.equal((await json<never>(submitWithoutProof)).error?.code, "PERSON_PROOF_REQUIRED");

  const proofIntentResponse = await createUploadIntent(
    jsonRequest(
      `/api/v1/uploader/assets/${person.id}/file-uploads`,
      "POST",
      {
        fileType: "person_proof",
        fileName: "proof.webp",
        mimeType: "image/webp",
        sizeBytes: 500_000,
        sha256: "b".repeat(64)
      },
      writeHeaders(uploader)
    ),
    { params: Promise.resolve({ assetId: person.id }) }
  );
  const proofIntent = (await json<{ uploadId: string }>(proofIntentResponse)).data;
  const proofComplete = await completeUpload(
    jsonRequest(
      `/api/v1/uploader/assets/${person.id}/file-uploads/${proofIntent.uploadId}/complete`,
      "POST",
      {},
      writeHeaders(uploader)
    ),
    { params: Promise.resolve({ assetId: person.id, uploadId: proofIntent.uploadId }) }
  );
  assert.equal(proofComplete.status, 200);
  const proofRow = await getPrisma().assetFile.findFirstOrThrow({
    where: { assetId: person.id, fileType: "person_proof" }
  });
  assert.equal(proofRow.accessScope, "private");

  const submitKey = "t011-final-submit-key";
  const submitRequest = () =>
    submitAsset(
      jsonRequest(
        `/api/v1/uploader/assets/${person.id}/submit`,
        "POST",
        {},
        writeHeaders(uploader, { "idempotency-key": submitKey })
      ),
      { params: Promise.resolve({ assetId: person.id }) }
    );
  const submitted = await submitRequest();
  assert.equal(submitted.status, 200);
  const submittedData = (
    await json<{
      asset: { reviewStatus: string; certificationStatus: string };
      certificationFeeCharge: { id: string; amountCents: number; status: string };
      idempotentReplay: boolean;
      nextStep: string;
    }>(submitted)
  ).data;
  assert.equal(submittedData.asset.reviewStatus, "draft");
  assert.equal(submittedData.asset.certificationStatus, "pending_payment");
  assert.equal(submittedData.certificationFeeCharge.amountCents, 1000);
  assert.equal(submittedData.certificationFeeCharge.status, "pending");
  assert.equal(submittedData.nextStep, "certification_fee_payment_not_connected");
  assert.equal(submittedData.idempotentReplay, false);

  const repeatedSubmit = await submitRequest();
  assert.equal(repeatedSubmit.status, 200);
  const repeatedSubmitData = (
    await json<{
      certificationFeeCharge: { id: string };
      idempotentReplay: boolean;
    }>(repeatedSubmit)
  ).data;
  assert.equal(repeatedSubmitData.certificationFeeCharge.id, submittedData.certificationFeeCharge.id);
  assert.equal(repeatedSubmitData.idempotentReplay, true);
  assert.equal(
    await getPrisma().certificationFeeCharge.count({ where: { assetId: person.id } }),
    1
  );

  const objectResponse = await createUploaderAsset(
    jsonRequest(
      "/api/v1/uploader/assets",
      "POST",
      { type: "object", title: "T011 道具素材草稿", tags: [] },
      writeHeaders(uploader)
    )
  );
  const objectAsset = (await json<{ id: string; priceCents: number }>(objectResponse)).data;
  assert.equal(objectAsset.priceCents, 1000);
  const forbiddenProof = await createUploadIntent(
    jsonRequest(
      `/api/v1/uploader/assets/${objectAsset.id}/file-uploads`,
      "POST",
      {
        fileType: "person_proof",
        fileName: "wrong-proof.png",
        mimeType: "image/png",
        sizeBytes: 100,
        sha256: "c".repeat(64)
      },
      writeHeaders(uploader)
    ),
    { params: Promise.resolve({ assetId: objectAsset.id }) }
  );
  assert.equal(forbiddenProof.status, 422);
  assert.equal((await json<never>(forbiddenProof)).error?.code, "UPLOAD_FILE_REJECTED");

  const sceneResponse = await createUploaderAsset(
    jsonRequest(
      "/api/v1/uploader/assets",
      "POST",
      { type: "scene", title: "T011 场景素材草稿", tags: [] },
      writeHeaders(uploader)
    )
  );
  assert.equal((await json<{ priceCents: number }>(sceneResponse)).data.priceCents, 5000);
});
