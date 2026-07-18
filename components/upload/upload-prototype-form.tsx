"use client";

import { Check, FileImage, Info, UploadSimple } from "@phosphor-icons/react";
import { useState } from "react";

const types = [
  { value: "人物", price: 50, note: "需要补充必要证明材料" },
  { value: "物件/道具", price: 10, note: "不强制必要证明材料" },
  { value: "场景", price: 50, note: "不强制必要证明材料" }
];

export function UploadPrototypeForm() {
  const [type, setType] = useState("人物");
  const [previewReady, setPreviewReady] = useState(false);
  const [message, setMessage] = useState("");
  const selected = types.find((item) => item.value === type) ?? types[0];

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <form className="ui-panel p-5 sm:p-7" onSubmit={(event) => { event.preventDefault(); setMessage("演示提交已完成页面校验，但不会上传文件、扣费或创建审核记录。"); }}>
        <div className="flex items-center justify-between gap-4 border-b border-line pb-5"><div><h2 className="text-lg font-bold text-ink">素材基础信息</h2><p className="mt-1 text-xs text-muted">带 * 的字段为正式提交时必填</p></div><span className="demo-label">演示表单</span></div>
        <div className="mt-6 grid gap-5">
          <fieldset>
            <legend className="text-sm font-semibold text-ink">素材类型 *</legend>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">{types.map((item) => <label className={`cursor-pointer rounded-lg border p-4 transition ${type === item.value ? "border-brand bg-brand-soft" : "border-line bg-white hover:border-brand/40"}`} key={item.value}><input checked={type === item.value} className="sr-only" name="type" onChange={() => setType(item.value)} type="radio" /><span className="block text-sm font-semibold text-ink">{item.value}</span><span className="mt-1 block text-xs leading-5 text-muted">建议售价 ¥{item.price}</span></label>)}</div>
          </fieldset>
          <label className="grid gap-2 text-sm font-semibold text-ink">素材名称 *<input className="ui-input font-normal" placeholder="例如：都市青年自然光人物参考" required /></label>
          <label className="grid gap-2 text-sm font-semibold text-ink">素材说明<textarea className="ui-input min-h-28 resize-y font-normal" placeholder="说明适用场景、拍摄/创作方式与重要限制" /></label>
          <div>
            <span className="text-sm font-semibold text-ink">预览图 *</span>
            <button className={`mt-2 flex min-h-40 w-full flex-col items-center justify-center rounded-lg border border-dashed p-5 transition ${previewReady ? "border-success bg-emerald-50" : "border-line bg-paper hover:border-brand"}`} onClick={() => setPreviewReady(true)} type="button">
              {previewReady ? <><Check aria-hidden="true" className="text-success" size={28} weight="bold" /><span className="mt-2 text-sm font-semibold text-success">已添加演示文件 preview-4x3.png</span></> : <><UploadSimple aria-hidden="true" className="text-brand" size={28} /><span className="mt-2 text-sm font-semibold text-ink">点击模拟选择 4:3 预览图</span><span className="mt-1 text-xs text-muted">不会读取或上传本地文件</span></>}
            </button>
          </div>
          {type === "人物" ? <div className="rounded-lg border border-warning/30 bg-amber-50 p-4"><div className="flex gap-3"><Info aria-hidden="true" className="mt-0.5 shrink-0 text-warning" size={20} /><div><p className="text-sm font-semibold text-ink">人物素材需要必要证明材料</p><p className="mt-1 text-xs leading-5 text-muted">第二阶段只展示字段与说明，不接收证件或个人隐私文件。</p></div></div></div> : null}
          <button className="ui-button-primary w-full sm:w-fit" type="submit">检查并提交演示</button>
          {message ? <p className="rounded-md bg-paper p-3 text-sm leading-6 text-muted" role="status">{message}</p> : null}
        </div>
      </form>

      <aside className="grid h-fit gap-4 lg:sticky lg:top-24">
        <section className="ui-panel p-5"><h2 className="font-bold text-ink">本次提交摘要</h2><dl className="mt-4 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-muted">素材类型</dt><dd className="font-medium text-ink">{selected.value}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">建议售价</dt><dd className="font-semibold text-brand">¥{selected.price}</dd></div><div className="flex justify-between gap-4"><dt className="text-muted">证明材料</dt><dd className="text-right font-medium text-ink">{selected.note}</dd></div></dl></section>
        <section className="rounded-lg bg-ink p-5 text-white"><FileImage aria-hidden="true" size={24} weight="duotone" /><h2 className="mt-3 font-bold">正式流程尚未接入</h2><p className="mt-2 text-xs leading-6 text-white/70">真实原文件、COS、认证上传费、政府认证跳转与审核记录均留在后续任务。</p></section>
      </aside>
    </div>
  );
}
