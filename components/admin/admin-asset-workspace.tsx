"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { getAdminAsset } from "@/lib/admin/assets";

type AdminAssetDetail = Awaited<ReturnType<typeof getAdminAsset>>;
type ApiEnvelope<T> = { data?: T; error?: { code: string; message: string } };

async function sha256(file: File) {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function AdminAssetWorkspace({ asset }: { asset: AdminAssetDetail }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [reason, setReason] = useState("");
  const [certificateFileId, setCertificateFileId] = useState(asset.certification?.certificateFileId ?? "");
  const [snapshotFileId, setSnapshotFileId] = useState(asset.certification?.certificateSnapshotFileId ?? "");

  async function csrfToken() {
    const response = await fetch("/api/v1/auth/csrf", { cache: "no-store" });
    const payload = (await response.json()) as ApiEnvelope<{ csrfToken: string }>;
    if (!response.ok || !payload.data) throw new Error(payload.error?.message ?? "无法获取安全校验信息。");
    return payload.data.csrfToken;
  }

  async function mutate(path: string, body: unknown, method: "POST" | "PATCH" = "POST") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const token = await csrfToken();
      const response = await fetch(path, {
        method,
        headers: { "content-type": "application/json", "x-csrf-token": token },
        body: JSON.stringify(body)
      });
      const payload = (await response.json()) as ApiEnvelope<unknown>;
      if (!response.ok) throw new Error(payload.error?.message ?? "操作失败。");
      setMessage("操作已通过服务端事务保存，并写入审计日志。");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "操作失败。");
    } finally {
      setBusy(false);
    }
  }

  async function updateMetadata(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await mutate(
      `/api/v1/admin/assets/${asset.id}`,
      {
        title: String(form.get("title") ?? ""),
        description: String(form.get("description") ?? "") || null,
        category: String(form.get("category") ?? "") || null,
        tags: String(form.get("tags") ?? "").split(/[,，]/).map((tag) => tag.trim()).filter(Boolean)
      },
      "PATCH"
    );
  }

  async function uploadCertificateFile(file: File, fileType: "certificate_file" | "certificate_snapshot") {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const token = await csrfToken();
      const createResponse = await fetch(`/api/v1/admin/certifications/${asset.certification?.id}/file-uploads`, {
        method: "POST",
        headers: { "content-type": "application/json", "x-csrf-token": token },
        body: JSON.stringify({
          fileType,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          sha256: await sha256(file)
        })
      });
      const created = (await createResponse.json()) as ApiEnvelope<{ uploadId: string }>;
      if (!createResponse.ok || !created.data) throw new Error(created.error?.message ?? "无法创建上传意图。");

      const completeToken = await csrfToken();
      const completeResponse = await fetch(
        `/api/v1/admin/certifications/${asset.certification?.id}/file-uploads/${created.data.uploadId}/complete`,
        { method: "POST", headers: { "content-type": "application/json", "x-csrf-token": completeToken }, body: "{}" }
      );
      const completed = (await completeResponse.json()) as ApiEnvelope<{ fileId: string }>;
      if (!completeResponse.ok || !completed.data) throw new Error(completed.error?.message ?? "无法完成文件记录。");
      if (fileType === "certificate_file") setCertificateFileId(completed.data.fileId);
      else setSnapshotFileId(completed.data.fileId);
      setMessage("证书文件元数据已保存。当前本地 provider 不保存文件正文，也不代表 COS 已接通。");
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "文件记录失败。");
    } finally {
      setBusy(false);
    }
  }

  async function updateCertification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!asset.certification) return;
    const form = new FormData(event.currentTarget);
    const issuedDate = String(form.get("issuedAt") ?? "");
    await mutate(`/api/v1/admin/certifications/${asset.certification.id}/verify`, {
      status: String(form.get("status")),
      governmentSiteName: String(form.get("governmentSiteName") ?? "") || null,
      certificateNo: String(form.get("certificateNo") ?? "") || null,
      credential: String(form.get("credential") ?? "") || null,
      certificateFileId: certificateFileId || null,
      snapshotFileId: snapshotFileId || null,
      issuedAt: issuedDate ? new Date(`${issuedDate}T00:00:00+08:00`).toISOString() : null,
      notes: String(form.get("notes") ?? "") || null
    });
  }

  return (
    <div className="grid gap-6">
      {(message || error) && (
        <div className={`rounded-lg border px-4 py-3 text-sm ${error ? "border-brand/25 bg-red-50 text-brand-dark" : "border-success/25 bg-emerald-50 text-success"}`} role="status">
          {error || message}
        </div>
      )}

      <section className="ui-panel p-5">
        <h2 className="text-lg font-bold text-ink">素材基础信息</h2>
        <p className="mt-1 text-xs text-muted">运营只能修改标题、说明、分类和标签；售价、成交快照和权限不在此接口中。</p>
        <form className="mt-5 grid gap-4" onSubmit={updateMetadata}>
          <label><span className="ui-label">标题</span><input className="ui-input mt-2" defaultValue={asset.title} name="title" required /></label>
          <label><span className="ui-label">说明</span><textarea className="ui-input mt-2 min-h-24" defaultValue={asset.description ?? ""} name="description" /></label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label><span className="ui-label">分类</span><input className="ui-input mt-2" defaultValue={asset.category ?? ""} name="category" /></label>
            <label><span className="ui-label">标签（逗号分隔）</span><input className="ui-input mt-2" defaultValue={asset.tags.join("，")} name="tags" /></label>
          </div>
          <button className="ui-button-primary w-fit" disabled={busy} type="submit">保存基础信息</button>
        </form>
      </section>

      <section className="ui-panel p-5">
        <h2 className="text-lg font-bold text-ink">文件摘要与受控查看</h2>
        <div className="mt-4 grid gap-3">
          {asset.files.map((file) => (
            <article className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-line p-3" key={file.id}>
              <div><strong className="text-sm text-ink">{file.fileType}</strong><p className="mt-1 text-xs text-muted">{file.mimeType} · {file.fileSizeBytes} bytes</p></div>
              {file.sensitive ? <a className="text-sm font-semibold text-brand" href={`/api/v1/admin/files/${file.id}/view`} rel="noreferrer" target="_blank">短时查看</a> : <span className="text-xs text-muted">非敏感摘要</span>}
            </article>
          ))}
        </div>
      </section>

      {asset.reviewStatus === "pending_review" && (
        <section className="ui-panel p-5">
          <h2 className="text-lg font-bold text-ink">平台初审</h2>
          <p className="mt-1 text-xs text-muted">驳回原因必填；驳回后自动生成认证费退款待处理请求。</p>
          <textarea className="ui-input mt-4 min-h-24" onChange={(event) => setReason(event.target.value)} placeholder="通过说明（可选）或驳回原因（必填）" value={reason} />
          <div className="mt-4 flex flex-wrap gap-3">
            <button className="ui-button-primary" disabled={busy} onClick={() => mutate(`/api/v1/admin/assets/${asset.id}/review`, { decision: "approve", reason: reason || undefined })} type="button">初审通过</button>
            <button className="ui-button-secondary" disabled={busy || reason.trim().length < 2} onClick={() => mutate(`/api/v1/admin/assets/${asset.id}/review`, { decision: "reject", reason })} type="button">驳回并进入退款流程</button>
          </div>
        </section>
      )}

      {asset.certification && (
        <section className="ui-panel p-5">
          <h2 className="text-lg font-bold text-ink">认证记录</h2>
          <p className="mt-1 text-xs text-muted">当前不对接政府网站或 OCR；由超级/运营管理员人工录入和核验。</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <label className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">认证证书文件<input accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-3 block w-full text-xs" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCertificateFile(file, "certificate_file"); }} type="file" /></label>
            <label className="rounded-lg border border-dashed border-line p-4 text-sm text-muted">凭证截图/补充材料<input accept="image/jpeg,image/png,image/webp,application/pdf" className="mt-3 block w-full text-xs" disabled={busy} onChange={(event) => { const file = event.target.files?.[0]; if (file) void uploadCertificateFile(file, "certificate_snapshot"); }} type="file" /></label>
          </div>
          <form className="mt-5 grid gap-4" onSubmit={updateCertification}>
            <div className="grid gap-4 sm:grid-cols-2">
              <label><span className="ui-label">认证状态</span><select className="ui-input mt-2" defaultValue={asset.certification.status} name="status"><option value="certifying">认证中</option><option value="certified">已认证</option><option value="exception">认证异常</option></select></label>
              <label><span className="ui-label">认证来源</span><input className="ui-input mt-2" defaultValue={asset.certification.governmentSiteName ?? ""} name="governmentSiteName" placeholder="待确认时可留空" /></label>
              <label><span className="ui-label">证书编号</span><input className="ui-input mt-2" defaultValue={asset.certification.certificateNo ?? ""} name="certificateNo" /></label>
              <label><span className="ui-label">凭证</span><input className="ui-input mt-2" defaultValue={asset.certification.credential ?? ""} name="credential" /></label>
              <label><span className="ui-label">签发日期</span><input className="ui-input mt-2" defaultValue={asset.certification.certificateIssuedAt?.slice(0, 10) ?? ""} name="issuedAt" type="date" /></label>
              <label><span className="ui-label">证书文件 ID</span><input className="ui-input mt-2" onChange={(event) => setCertificateFileId(event.target.value)} value={certificateFileId} /></label>
            </div>
            <label><span className="ui-label">备注</span><textarea className="ui-input mt-2 min-h-20" defaultValue={asset.certification.notes ?? ""} name="notes" /></label>
            <button className="ui-button-primary w-fit" disabled={busy} type="submit">保存认证记录</button>
          </form>
        </section>
      )}

      <section className="ui-panel p-5">
        <h2 className="text-lg font-bold text-ink">上架控制</h2>
        <p className="mt-1 text-xs text-muted">服务端会同时检查初审、认证证书和水印预览，不能只改前端状态。</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button className="ui-button-primary" disabled={busy || asset.listingStatus === "listed"} onClick={() => mutate(`/api/v1/admin/assets/${asset.id}/listing`, { action: "list" })} type="button">上架素材</button>
          <button className="ui-button-secondary" disabled={busy || asset.listingStatus !== "listed"} onClick={() => mutate(`/api/v1/admin/assets/${asset.id}/listing`, { action: "delist", reason: "运营下架" })} type="button">下架素材</button>
        </div>
      </section>
    </div>
  );
}
