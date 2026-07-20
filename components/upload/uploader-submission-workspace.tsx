"use client";

import {
  ArrowRight,
  CheckCircle,
  CircleNotch,
  FileImage,
  Info,
  ShieldCheck,
  UploadSimple
} from "@phosphor-icons/react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

type AssetType = "person" | "object" | "scene";
type AssetFile = {
  id: string;
  fileType: "original" | "preview" | "thumbnail" | "person_proof" | "supporting_proof" | string;
  sizeBytes: number;
  mimeType: string;
  processingStatus: string | null;
  sourceFileId: string | null;
  providerMode: string | null;
};
type AssetDraft = {
  id: string;
  type: AssetType;
  title: string;
  description: string | null;
  tags: string[];
  reviewStatus: string;
  listingStatus: string;
  certificationStatus: string;
  priceCents: number;
  currency: string;
  files: AssetFile[];
  processingJobs: Array<{
    id: string;
    sourceFileId: string;
    status: string;
    watermarkTemplateVersion: string;
  }>;
  certificationFeeCharge: {
    id: string;
    amountCents: number;
    currency: string;
    status: string;
  } | null;
};

type ApiPayload<T> = {
  data?: T;
  error?: { code?: string; message?: string };
};

const TYPE_LABEL: Record<AssetType, string> = {
  person: "人物",
  object: "物件 / 道具",
  scene: "场景"
};

async function readPayload<T>(response: Response) {
  return (await response.json().catch(() => ({}))) as ApiPayload<T>;
}

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function UploaderSubmissionWorkspace() {
  const [assets, setAssets] = useState<AssetDraft[]>([]);
  const [draft, setDraft] = useState<AssetDraft | null>(null);
  const [formKind, setFormKind] = useState<"person" | "general">("person");
  const [generalType, setGeneralType] = useState<"object" | "scene">("object");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  const currentType: AssetType = formKind === "person" ? "person" : generalType;
  const editable = !draft ||
    (draft.reviewStatus === "draft" && draft.certificationStatus === "not_started");

  const setFromAsset = useCallback((asset: AssetDraft) => {
    setDraft(asset);
    setFormKind(asset.type === "person" ? "person" : "general");
    if (asset.type !== "person") setGeneralType(asset.type);
    setTitle(asset.title);
    setDescription(asset.description ?? "");
    setTags(asset.tags.join("、"));
  }, []);

  const loadAssets = useCallback(async (preferredId?: string) => {
    const response = await fetch("/api/v1/uploader/assets", { cache: "no-store" });
    const payload = await readPayload<AssetDraft[]>(response);
    if (!response.ok || !payload.data) {
      setMessage(payload.error?.message ?? "暂时无法读取上传记录。 ");
      return;
    }
    setAssets(payload.data);
    const preferred = preferredId
      ? payload.data.find((asset) => asset.id === preferredId)
      : null;
    if (preferred) setFromAsset(preferred);
  }, [setFromAsset]);

  useEffect(() => {
    let active = true;
    void fetch("/api/v1/uploader/assets", { cache: "no-store" })
      .then(async (response) => ({ response, payload: await readPayload<AssetDraft[]>(response) }))
      .then(({ response, payload }) => {
        if (!active) return;
        if (!response.ok || !payload.data) {
          setMessage(payload.error?.message ?? "暂时无法读取上传记录。 ");
          return;
        }
        setAssets(payload.data);
      });
    return () => {
      active = false;
    };
  }, []);

  async function csrfToken() {
    const response = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
    const payload = await readPayload<{ csrfToken: string }>(response);
    if (!response.ok || !payload.data?.csrfToken) {
      throw new Error(payload.error?.message ?? "无法完成安全校验。 ");
    }
    return payload.data.csrfToken;
  }

  async function write<T>(
    path: string,
    method: "POST" | "PATCH",
    body: unknown,
    extraHeaders: Record<string, string> = {}
  ) {
    const response = await fetch(path, {
      method,
      headers: {
        "content-type": "application/json",
        "x-csrf-token": await csrfToken(),
        ...extraHeaders
      },
      body: JSON.stringify(body)
    });
    const payload = await readPayload<T>(response);
    if (!response.ok || !payload.data) {
      throw new Error(payload.error?.message ?? "操作失败，请稍后重试。 ");
    }
    return payload.data;
  }

  function tagList() {
    return tags
      .split(/[、,，]/)
      .map((tag) => tag.trim())
      .filter(Boolean)
      .slice(0, 10);
  }

  async function createDraft() {
    if (title.trim().length < 2) {
      setMessage("请先填写至少 2 个字的素材名称。 ");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const asset = await write<AssetDraft>("/api/v1/uploader/assets", "POST", {
        type: currentType,
        title,
        description: description || null,
        tags: tagList()
      });
      setFromAsset(asset);
      await loadAssets(asset.id);
      setMessage("素材草稿已创建。现在可以直传原文件并完成对象确认。 ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "素材草稿创建失败。 ");
    } finally {
      setBusy(false);
    }
  }

  async function saveDraft() {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      const updated = await write<AssetDraft>(`/api/v1/uploader/assets/${draft.id}`, "PATCH", {
        title,
        description: description || null,
        tags: tagList()
      });
      setFromAsset(updated);
      await loadAssets(updated.id);
      setMessage("草稿信息已保存。 ");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "草稿保存失败。 ");
    } finally {
      setBusy(false);
    }
  }

  async function uploadFiles(
    files: FileList | null,
    fileType: "original" | "person_proof" | "supporting_proof"
  ) {
    if (!draft || !files?.length) return;
    setBusy(true);
    setMessage("正在由浏览器计算文件哈希并建立受控上传意图…");
    try {
      for (const file of Array.from(files)) {
        const intent = await write<{
          uploadId: string;
          provider: string;
          providerMode: string;
          providerDisclosure: string;
          uploadUrl: string;
          method: "PUT";
          requiredHeaders: Record<string, string>;
        }>(`/api/v1/uploader/assets/${draft.id}/file-uploads`, "POST", {
          fileType,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          sha256: await sha256(file)
        });

        if (intent.provider !== "local_test") {
          const directUpload = await fetch(intent.uploadUrl, {
            method: intent.method,
            headers: intent.requiredHeaders,
            body: file
          });
          if (!directUpload.ok) throw new Error("文件直传存储 provider 失败。 ");
        }

        const completed = await write<{
          processingJobId: string | null;
          derivativeStatus: string;
        }>(
          `/api/v1/uploader/assets/${draft.id}/file-uploads/${intent.uploadId}/complete`,
          "POST",
          {}
        );
        if (completed.processingJobId) {
          await write(
            `/api/v1/uploader/assets/${draft.id}/processing-jobs/${completed.processingJobId}/run`,
            "POST",
            {}
          );
        }
      }
      await loadAssets(draft.id);
      setMessage(
        "本地测试流程已完成：暂存对象已确认到不可变最终 key，并生成独立水印预览/缩略图对象元数据；未上传或处理真实图片正文。"
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "文件流程执行失败。 ");
    } finally {
      setBusy(false);
    }
  }

  async function submit() {
    if (!draft) return;
    setBusy(true);
    setMessage("");
    try {
      const result = await write<{
        message: string;
        certificationFeeCharge: { amountCents: number; status: string };
      }>(
        `/api/v1/uploader/assets/${draft.id}/submit`,
        "POST",
        {},
        { "idempotency-key": crypto.randomUUID() }
      );
      await loadAssets(draft.id);
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "素材提交失败。 ");
    } finally {
      setBusy(false);
    }
  }

  function startNew(kind: "person" | "general") {
    setDraft(null);
    setFormKind(kind);
    setTitle("");
    setDescription("");
    setTags("");
    setMessage("");
  }

  const fileCounts = useMemo(() => {
    const files = draft?.files ?? [];
    return {
      originals: files.filter((file) => file.fileType === "original").length,
      proofs: files.filter((file) => ["person_proof", "supporting_proof"].includes(file.fileType)).length,
      previews: files.filter((file) => file.fileType === "preview").length,
      thumbnails: files.filter((file) => file.fileType === "thumbnail").length
    };
  }, [draft]);

  if (draft?.certificationStatus === "pending_payment" && draft.certificationFeeCharge) {
    return (
      <section className="ui-panel overflow-hidden">
        <div className="border-b border-emerald-200 bg-emerald-50 px-5 py-8 text-center sm:px-8 sm:py-10">
          <CheckCircle aria-hidden="true" className="mx-auto text-success" size={52} weight="fill" />
          <p className="mt-4 text-xs font-semibold uppercase tracking-[0.18em] text-success">Submission received</p>
          <h2 className="mt-2 text-2xl font-bold text-ink sm:text-3xl">素材资料已提交</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
            当前等待支付认证上传费。完成支付后，素材才会进入平台审核流程。
          </p>
        </div>

        <div className="grid gap-6 p-5 sm:p-8">
          <dl className="grid gap-4 rounded-lg border border-line bg-paper p-5 text-sm sm:grid-cols-2">
            <SummaryRow label="素材名称" value={draft.title} />
            <SummaryRow label="素材类型" value={TYPE_LABEL[draft.type]} />
            <SummaryRow
              label="认证上传费"
              value={`¥${(draft.certificationFeeCharge.amountCents / 100).toFixed(0)}`}
            />
            <SummaryRow label="当前状态" value="等待支付" />
          </dl>

          <div className="rounded-lg border border-warning/30 bg-amber-50 p-4">
            <div className="flex gap-3">
              <Info aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={20} />
              <div>
                <p className="text-sm font-semibold text-ink">本地测试支付已开放</p>
                <p className="mt-1 text-xs leading-6 text-muted">
                  可使用明确标识的本地测试适配器完成签名回调验证；真实微信支付和支付宝商户接口仍未接入。
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link className="ui-button-primary" href={`/checkout?certificationFeeChargeId=${encodeURIComponent(draft.certificationFeeCharge.id)}`}>支付认证上传费</Link>
            <Link className="ui-button-secondary" href="/account/uploads">查看我的上传</Link>
            <button
              className="ui-button-secondary"
              onClick={() => startNew(draft.type === "person" ? "person" : "general")}
              type="button"
            >
              继续上传素材
            </button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_340px]">
      <section className="grid gap-5">
        <div className="grid gap-3 sm:grid-cols-2" role="tablist" aria-label="素材提交表单类型">
          <button
            aria-selected={formKind === "person"}
            className={`rounded-lg border p-5 text-left transition ${formKind === "person" ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand/40"}`}
            disabled={Boolean(draft)}
            onClick={() => startNew("person")}
            role="tab"
            type="button"
          >
            <span className="text-sm font-bold text-ink">人物素材表单</span>
            <span className="mt-2 block text-xs leading-5 text-muted">独立表单；原文件和必要证明材料都必须完成确认。</span>
          </button>
          <button
            aria-selected={formKind === "general"}
            className={`rounded-lg border p-5 text-left transition ${formKind === "general" ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand/40"}`}
            disabled={Boolean(draft)}
            onClick={() => startNew("general")}
            role="tab"
            type="button"
          >
            <span className="text-sm font-bold text-ink">物件 / 场景共用表单</span>
            <span className="mt-2 block text-xs leading-5 text-muted">共用字段；证明材料可按需上传。</span>
          </button>
        </div>

        <form
          className="ui-panel p-5 sm:p-7"
          onSubmit={(event) => {
            event.preventDefault();
            void (draft ? saveDraft() : createDraft());
          }}
        >
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-line pb-5">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-brand">
                {formKind === "person" ? "Person asset form" : "Object / scene form"}
              </p>
              <h2 className="mt-2 text-xl font-bold text-ink">
                {formKind === "person" ? "提交人物素材" : "提交物件或场景素材"}
              </h2>
            </div>
            <span className="demo-label">本地测试 provider</span>
          </div>

          <div className="mt-6 grid gap-5">
            {formKind === "general" ? (
              <fieldset disabled={Boolean(draft)}>
                <legend className="text-sm font-semibold text-ink">素材类型 *</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  {(["object", "scene"] as const).map((type) => (
                    <label
                      className={`cursor-pointer rounded-lg border p-4 ${generalType === type ? "border-brand bg-brand-soft" : "border-line bg-white"}`}
                      key={type}
                    >
                      <input
                        checked={generalType === type}
                        className="sr-only"
                        name="generalType"
                        onChange={() => setGeneralType(type)}
                        type="radio"
                      />
                      <span className="text-sm font-semibold text-ink">{TYPE_LABEL[type]}</span>
                      <span className="mt-1 block text-xs text-muted">系统定价 ¥{type === "object" ? 10 : 50}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
            ) : (
              <div className="rounded-lg border border-warning/30 bg-amber-50 p-4">
                <div className="flex gap-3">
                  <Info aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={20} />
                  <div>
                    <p className="text-sm font-semibold text-ink">人物素材专用规则</p>
                    <p className="mt-1 text-xs leading-5 text-muted">至少一份原文件和一份必要证明材料；证明材料始终私有。</p>
                  </div>
                </div>
              </div>
            )}

            <label className="grid gap-2 text-sm font-semibold text-ink">
              素材名称 *
              <input
                className="ui-input font-normal"
                disabled={!editable || busy}
                maxLength={100}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="例如：都市青年自然光人物参考"
                required
                value={title}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              素材说明
              <textarea
                className="ui-input min-h-28 resize-y font-normal"
                disabled={!editable || busy}
                maxLength={1000}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="说明适用场景、拍摄方式与重要限制"
                value={description}
              />
            </label>
            <label className="grid gap-2 text-sm font-semibold text-ink">
              标签
              <input
                className="ui-input font-normal"
                disabled={!editable || busy}
                onChange={(event) => setTags(event.target.value)}
                placeholder="用逗号或顿号分隔，最多 10 个"
                value={tags}
              />
            </label>

            <div className="flex flex-wrap gap-3">
              <button className="ui-button-primary" disabled={busy || !editable} type="submit">
                {busy ? <CircleNotch className="animate-spin" size={17} /> : null}
                {draft ? "保存草稿修改" : "创建素材草稿"}
              </button>
              {draft ? (
                <button className="ui-button-secondary" disabled={busy} onClick={() => startNew(formKind)} type="button">
                  新建另一份素材
                </button>
              ) : null}
            </div>
          </div>
        </form>

        {draft ? (
          <section className="ui-panel p-5 sm:p-7">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-lg font-bold text-ink">文件直传与确认</h2>
                <p className="mt-1 text-xs leading-5 text-muted">浏览器计算哈希；Next.js 只接收元数据，不接收图片正文。</p>
              </div>
              <span className="text-xs font-medium text-muted">草稿 {draft.id.slice(0, 8)}</span>
            </div>
            <div className="mt-5 grid gap-4 md:grid-cols-2">
              <label className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center ${editable ? "border-line bg-paper hover:border-brand" : "cursor-not-allowed border-line bg-paper/60 opacity-60"}`}>
                <UploadSimple aria-hidden="true" className="text-brand" size={28} />
                <span className="mt-3 text-sm font-semibold text-ink">选择原文件（可多选）</span>
                <span className="mt-1 text-xs leading-5 text-muted">JPEG / PNG / WebP，单个不超过 25MB</span>
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="sr-only"
                  disabled={!editable || busy}
                  multiple
                  onChange={(event) => {
                    void uploadFiles(event.target.files, "original");
                    event.target.value = "";
                  }}
                  type="file"
                />
              </label>
              {draft.type === "person" ? (
                <label className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center ${editable ? "border-warning/40 bg-amber-50 hover:border-warning" : "cursor-not-allowed border-line bg-paper/60 opacity-60"}`}>
                  <ShieldCheck aria-hidden="true" className="text-warning" size={28} />
                  <span className="mt-3 text-sm font-semibold text-ink">选择必要证明材料</span>
                  <span className="mt-1 text-xs leading-5 text-muted">始终私有；不会作为公开预览图</span>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={!editable || busy}
                    onChange={(event) => {
                      void uploadFiles(event.target.files, "person_proof");
                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
              ) : (
                <label className={`flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed p-5 text-center ${editable ? "border-line bg-paper hover:border-brand" : "cursor-not-allowed border-line bg-paper/60 opacity-60"}`}>
                  <ShieldCheck aria-hidden="true" className="text-brand" size={28} />
                  <span className="mt-3 text-sm font-semibold text-ink">证明材料（选填）</span>
                  <span className="mt-1 text-xs leading-5 text-muted">如有来源、版权或所有权证明，可选择上传。</span>
                  <input
                    accept="image/jpeg,image/png,image/webp"
                    className="sr-only"
                    disabled={!editable || busy}
                    onChange={(event) => {
                      void uploadFiles(event.target.files, "supporting_proof");
                      event.target.value = "";
                    }}
                    type="file"
                  />
                </label>
              )}
            </div>
            <div className="mt-5 rounded-lg border border-line bg-white p-4">
              <div className="grid gap-3 text-sm sm:grid-cols-4">
                <StatusCount label="私有原文件" value={fileCounts.originals} />
                <StatusCount label="私有证明材料" value={fileCounts.proofs} />
                <StatusCount label="水印预览对象" value={fileCounts.previews} />
                <StatusCount label="缩略图对象" value={fileCounts.thumbnails} />
              </div>
            </div>
          </section>
        ) : null}

        {draft ? (
          <section className="rounded-lg bg-ink p-5 text-white sm:p-6">
            <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
              <div>
                <p className="text-sm font-bold">提交到认证流程</p>
                <p className="mt-2 max-w-2xl text-xs leading-6 text-white/70">
                  {draft.type === "person"
                    ? "提交前会检查原文件、必要证明材料和每份原文件的水印衍生对象。"
                    : "提交前会检查原文件和每份原文件的水印衍生对象。"}
                  真实认证费支付尚未接入，提交后停在待支付状态，不会伪造进入初审。
                </p>
              </div>
              <button className="ui-button-primary shrink-0" disabled={busy || !editable} onClick={() => void submit()} type="button">
                检查并提交
              </button>
            </div>
          </section>
        ) : null}

        {message ? (
          <p aria-live="polite" className="rounded-lg border border-line bg-white p-4 text-sm leading-6 text-muted" role="status">
            {message}
          </p>
        ) : null}
      </section>

      <aside className="grid h-fit gap-4 xl:sticky xl:top-24">
        <section className="ui-panel p-5">
          <h2 className="font-bold text-ink">当前提交摘要</h2>
          <dl className="mt-4 grid gap-3 text-sm">
            <SummaryRow label="素材类型" value={TYPE_LABEL[draft?.type ?? currentType]} />
            <SummaryRow label="系统定价" value={`¥${((draft?.priceCents ?? (currentType === "object" ? 1000 : 5000)) / 100).toFixed(0)}`} />
            <SummaryRow label="审核状态" value={draft?.reviewStatus ?? "尚未创建"} />
            <SummaryRow label="认证状态" value={draft?.certificationStatus ?? "尚未创建"} />
          </dl>
          {draft?.certificationFeeCharge ? (
            <div className="mt-4 rounded-md bg-brand-soft p-3 text-xs leading-5 text-ink">
              认证上传费：¥{draft.certificationFeeCharge.amountCents / 100}，状态 {draft.certificationFeeCharge.status}。真实支付将在后续任务接入。
            </div>
          ) : null}
        </section>
        <section className="rounded-lg border border-line bg-paper p-5">
          <FileImage aria-hidden="true" className="text-brand" size={24} weight="duotone" />
          <h2 className="mt-3 font-bold text-ink">真实边界</h2>
          <p className="mt-2 text-xs leading-6 text-muted">当前 provider 只持久化上传意图、不可变对象定位和处理元数据。真实 COS、图片水印处理和 CDN 仍在 T017，不会把测试地址宣传为真实云服务。</p>
        </section>
        <section className="ui-panel p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="font-bold text-ink">最近上传记录</h2>
              <span className="rounded-full bg-brand-soft px-2 py-0.5 text-xs font-semibold text-brand">
                {assets.length}
              </span>
            </div>
            <Link
              className="group inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-brand transition hover:text-brand-dark"
              href="/account/uploads"
            >
              查看我的上传
              <ArrowRight
                aria-hidden="true"
                className="transition-transform group-hover:translate-x-1"
                size={15}
                weight="bold"
              />
            </Link>
          </div>
          <div className="mt-4 grid gap-2">
            {assets.length ? assets.slice(0, 8).map((asset) => (
              <button
                className={`rounded-md border p-3 text-left text-sm transition ${draft?.id === asset.id ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand/40"}`}
                key={asset.id}
                onClick={() => setFromAsset(asset)}
                type="button"
              >
                <span className="block font-semibold text-ink">{asset.title}</span>
                <span className="mt-1 block text-xs text-muted">{TYPE_LABEL[asset.type]} · {asset.certificationStatus}</span>
              </button>
            )) : <p className="text-xs leading-5 text-muted">尚无素材草稿。</p>}
          </div>
        </section>
      </aside>
    </div>
  );
}

function StatusCount({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-lg font-bold text-ink">{value}</p>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-muted">{label}</dt>
      <dd className="text-right font-semibold text-ink">{value}</dd>
    </div>
  );
}
