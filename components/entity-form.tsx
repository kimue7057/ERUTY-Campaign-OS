"use client";
import { useId, useState } from "react";
import { api } from "./api";

export type Field = {
  key: string;
  label: string;
  type?: "text" | "date" | "money" | "select" | "number" | "textarea";
  options?: { value: string; label: string }[];
  nullable?: boolean;
  disabled?: boolean;
};
type Props = {
  title: string;
  path: string;
  fields: Field[];
  values: Record<string, unknown>;
  onSaved: (value: { id: string }) => void | Promise<unknown>;
  onCancel: () => void;
  editing?: boolean;
  hint?: string;
};
export function EntityForm({
  title,
  path,
  fields,
  values,
  onSaved,
  onCancel,
  editing,
  hint,
}: Props) {
  const id = useId();
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <section className="editor" aria-label={title}>
      <div className="section-head">
        <h2>{title}</h2>
        <button
          type="button"
          className="quiet"
          disabled={busy}
          onClick={onCancel}
        >
          닫기
        </button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          const form = new FormData(e.currentTarget);
          const data: Record<string, unknown> = { ...values };
          for (const f of fields) {
            if (f.disabled) continue;
            const value = String(form.get(f.key) ?? "");
            data[f.key] =
              f.nullable && !value
                ? null
                : f.type === "number"
                  ? Number(value)
                  : value;
          }
          try {
            await onSaved(
              await api<{ id: string }>(path, editing ? "PATCH" : "POST", data),
            );
          } catch (err) {
            setError(
              err instanceof Error ? err.message : "저장할 수 없습니다.",
            );
          } finally {
            setBusy(false);
          }
        }}
      >
        <div className="form-grid">
          {fields.map((f) => (
            <div key={f.key}>
              <label htmlFor={`${id}-${f.key}`}>
                <span>{f.label}</span>
              </label>
              {f.type === "textarea" ? (
                <textarea id={`${id}-${f.key}`} name={f.key} disabled={busy || f.disabled} required={!f.nullable} rows={6} maxLength={10000} defaultValue={String(values[f.key] ?? "")} />
              ) : f.type === "select" ? (
                <select
                  id={`${id}-${f.key}`}
                  name={f.key}
                  disabled={busy || f.disabled}
                  required={!f.nullable}
                  defaultValue={String(values[f.key] ?? "")}
                >
                  <option value="">
                    {f.nullable ? "미지정" : "선택해 주세요"}
                  </option>
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  id={`${id}-${f.key}`}
                  name={f.key}
                  disabled={busy || f.disabled}
                  required={!f.nullable}
                  type={
                    f.type === "date"
                      ? "date"
                      : f.type === "number"
                        ? "number"
                        : "text"
                  }
                  inputMode={
                    f.type === "money" || f.type === "number"
                      ? "numeric"
                      : undefined
                  }
                  pattern={f.type === "money" ? "(0|[1-9][0-9]*)" : undefined}
                  min={f.type === "number" ? 0 : undefined}
                  maxLength={
                    f.type === "money"
                      ? 19
                      : f.type === "text"
                        ? 120
                        : undefined
                  }
                  defaultValue={String(values[f.key] ?? "")}
                />
              )}
            </div>
          ))}
        </div>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <div className="form-actions">
          <p className="muted">
            {hint ?? "금액은 원화 정수, 날짜는 한국 기준 계획일입니다."}
          </p>
          <button className="primary" disabled={busy}>
            {busy ? "저장 중…" : "저장"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function DeleteButton({
  path,
  revision,
  name,
  onDeleted,
  disabled = false,
}: {
  path: string;
  revision: number;
  name: string;
  onDeleted: () => void | Promise<unknown>;
  disabled?: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <span className="delete-control">
      {!confirming ? (
        <button
          disabled={disabled}
          className="quiet danger"
          onClick={() => setConfirming(true)}
          aria-label={`${name} 삭제`}
        >
          삭제
        </button>
      ) : (
        <>
          <span>{name} 삭제?</span>
          <button
            className="quiet danger"
            aria-label={`${name} 삭제 확인`}
            disabled={busy || disabled}
            onClick={async () => {
              setBusy(true);
              setError("");
              try {
                await api(`${path}?revision=${revision}`, "DELETE");
                await onDeleted();
                setConfirming(false);
              } catch (err) {
                setError(
                  err instanceof Error ? err.message : "삭제할 수 없습니다.",
                );
              } finally {
                setBusy(false);
              }
            }}
          >
            삭제 확인
          </button>
          <button
            className="quiet"
            onClick={() => {
              setConfirming(false);
              setError("");
            }}
          >
            취소
          </button>
        </>
      )}
      {error && (
        <span className="error" role="alert">
          {error}
        </span>
      )}
    </span>
  );
}
