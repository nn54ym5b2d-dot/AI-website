import { z } from "zod";
import { apiErrorResponse, createRequestId } from "@/lib/api/http";
import { parseInput } from "@/lib/api/validation";
import { requireContentAdminAccess } from "@/lib/admin/access";
import { getSensitiveFile } from "@/lib/admin/assets";
import { verifySensitiveFileViewToken } from "@/lib/admin/sensitive-file-token";

const idSchema = z.string().uuid();
type Context = { params: Promise<{ fileId: string }> };

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    "\"": "&quot;"
  })[character] ?? character);
}

export async function GET(request: Request, context: Context) {
  const requestId = createRequestId();
  try {
    const access = await requireContentAdminAccess(request);
    const { fileId: rawFileId } = await context.params;
    const fileId = parseInput(idSchema, rawFileId);
    const token = new URL(request.url).searchParams.get("token") ?? "";
    verifySensitiveFileViewToken(token, fileId, access.user.id);
    const { file } = await getSensitiveFile(access, fileId, requestId);
    const html = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>敏感文件受控查看</title><style>body{font-family:system-ui,sans-serif;background:#f7f4ef;color:#231f20;margin:0;padding:40px}.card{max-width:720px;margin:auto;background:#fff;border:1px solid #ded8d0;border-radius:16px;padding:28px}h1{font-size:24px}dl{display:grid;grid-template-columns:130px 1fr;gap:12px;margin-top:24px}dt{color:#6f6864}dd{margin:0}.notice{background:#fff5dc;border-radius:10px;padding:14px;line-height:1.7}</style></head><body><main class="card"><h1>敏感文件受控查看</h1><p class="notice">当前使用本地元数据测试 provider，未保存文件正文，因此这里只展示已核验的文件摘要。真实 COS 短时签名查看将在 T017 接入；本次访问已经写入审计日志。</p><dl><dt>文件编号</dt><dd>${escapeHtml(file.id)}</dd><dt>用途</dt><dd>${escapeHtml(file.fileType)}</dd><dt>MIME</dt><dd>${escapeHtml(file.mimeType)}</dd><dt>大小</dt><dd>${escapeHtml(file.fileSizeBytes)} bytes</dd></dl></main></body></html>`;
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "private, no-store",
        "x-robots-tag": "noindex, nofollow"
      }
    });
  } catch (error) {
    return apiErrorResponse(error, requestId);
  }
}
