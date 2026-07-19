import assert from "node:assert/strict";
import test from "node:test";

import { GET as getAssets } from "../app/api/v1/assets/route.ts";
import { GET as getAssetDetail } from "../app/api/v1/assets/[assetId]/route.ts";
import { GET as getCategories } from "../app/api/v1/categories/route.ts";
import { GET as getTags } from "../app/api/v1/tags/route.ts";
import { getPrisma } from "../lib/db/prisma.ts";
import type { PublicAssetDetailResponse, PublicAssetListResponse } from "../types/materials.ts";

const shouldRun = process.env.RUN_DB_TESTS === "1";
const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
const personAssetId = "10000000-0000-4000-8000-000000000001";

function request(path: string) {
  return new Request(`${appUrl}${path}`);
}

async function json<T>(response: Response) {
  return (await response.json()) as T;
}

test("公开素材 API 只返回已上架认证素材和已就绪水印衍生图", { skip: !shouldRun }, async () => {
  const response = await getAssets(request("/api/v1/assets?sort=newest&limit=20"));
  assert.equal(response.status, 200);
  const payload = await json<PublicAssetListResponse>(response);
  assert.equal(payload.data.length, 3);
  assert.deepEqual(payload.data.map((asset) => asset.type), ["person", "object", "scene"]);
  assert.equal(payload.meta.hasMore, false);

  for (const asset of payload.data) {
    assert.equal(asset.certificationStatus, "certified");
    assert.match(asset.preview.url, /^\/material-previews\/[0-9a-f-]{36}\.png$/);
    assert.equal(asset.preview.watermarkTemplateVersion, "t010-local-v1");
  }

  const serialized = JSON.stringify(payload);
  assert.equal(serialized.includes("cosBucket"), false);
  assert.equal(serialized.includes("cosObjectKey"), false);
  assert.equal(serialized.includes("private-originals"), false);
  assert.equal(serialized.includes("sourceFileId"), false);

  const storedFiles = await getPrisma().assetFile.findMany({
    where: { assetId: personAssetId },
    orderBy: { createdAt: "asc" }
  });
  const originals = storedFiles.filter((file) => file.fileType === "original");
  const previews = storedFiles.filter((file) => file.fileType === "preview");
  assert.equal(originals.length, 2);
  assert.equal(previews.length, 2);
  assert.ok(originals.every((file) => file.accessScope === "private"));
  assert.ok(previews.every((file) => file.accessScope === "public_preview"));
  assert.ok(previews.every((file) => !originals.some((original) => original.cosObjectKey === file.cosObjectKey)));
  assert.ok(previews.every((file) => {
    const metadata = file.metadata as { processingStatus?: string; sourceFileId?: string };
    return metadata.processingStatus === "ready" && originals.some((original) => original.id === metadata.sourceFileId);
  }));
});

test("公开素材 API 支持类型、关键词、标签、价格、上架时间、排序和游标", { skip: !shouldRun }, async () => {
  const objectResponse = await getAssets(
    request("/api/v1/assets?type=object&q=%E5%8F%B0%E7%81%AF&tag=%E9%87%91%E5%B1%9E&minPriceCents=1000&maxPriceCents=1000&sort=price_asc")
  );
  assert.equal(objectResponse.status, 200);
  const objectPayload = await json<PublicAssetListResponse>(objectResponse);
  assert.equal(objectPayload.data.length, 1);
  assert.equal(objectPayload.data[0]?.type, "object");
  assert.equal(objectPayload.data[0]?.priceCents, 1000);

  const recentResponse = await getAssets(
    request("/api/v1/assets?listedAfter=2026-07-17T00%3A00%3A00.000Z&sort=newest")
  );
  const recentPayload = await json<PublicAssetListResponse>(recentResponse);
  assert.deepEqual(recentPayload.data.map((asset) => asset.type), ["person", "object"]);

  const firstPageResponse = await getAssets(request("/api/v1/assets?sort=price_asc&limit=1"));
  const firstPage = await json<PublicAssetListResponse>(firstPageResponse);
  assert.equal(firstPage.data.length, 1);
  assert.equal(firstPage.meta.hasMore, true);
  assert.ok(firstPage.meta.nextCursor);
  const secondPageResponse = await getAssets(
    request(`/api/v1/assets?sort=price_asc&limit=1&cursor=${encodeURIComponent(firstPage.meta.nextCursor ?? "")}`)
  );
  const secondPage = await json<PublicAssetListResponse>(secondPageResponse);
  assert.equal(secondPage.data.length, 1);
  assert.notEqual(secondPage.data[0]?.id, firstPage.data[0]?.id);

  const invalidPriceResponse = await getAssets(
    request("/api/v1/assets?minPriceCents=5000&maxPriceCents=1000")
  );
  assert.equal(invalidPriceResponse.status, 422);
});

test("素材详情、分类和标签接口保持公开字段边界", { skip: !shouldRun }, async () => {
  const detailResponse = await getAssetDetail(request(`/api/v1/assets/${personAssetId}`), {
    params: Promise.resolve({ assetId: personAssetId })
  });
  assert.equal(detailResponse.status, 200);
  const detail = await json<PublicAssetDetailResponse>(detailResponse);
  assert.equal(detail.data.previews.length, 2);
  assert.equal(detail.data.priceCents, 5000);
  assert.deepEqual(new Set(detail.data.tags), new Set(["写实", "都市", "自然光", "青年"]));
  assert.equal(JSON.stringify(detail).includes("cosObjectKey"), false);

  const categoriesResponse = await getCategories();
  assert.equal(categoriesResponse.status, 200);
  const categories = await json<{ data: Array<{ type: string; count: number }> }>(categoriesResponse);
  assert.deepEqual(categories.data.map((category) => category.type), ["person", "object", "scene"]);
  assert.ok(categories.data.every((category) => category.count === 1));

  const tagsResponse = await getTags(request("/api/v1/tags?q=%E5%B7%A5%E4%B8%9A&limit=10"));
  assert.equal(tagsResponse.status, 200);
  const tags = await json<{ data: string[] }>(tagsResponse);
  assert.deepEqual(tags.data, ["工业"]);

  const missingResponse = await getAssetDetail(request("/api/v1/assets/00000000-0000-4000-8000-000000000000"), {
    params: Promise.resolve({ assetId: "00000000-0000-4000-8000-000000000000" })
  });
  assert.equal(missingResponse.status, 404);
});
