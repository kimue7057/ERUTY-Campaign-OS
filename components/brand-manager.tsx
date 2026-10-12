"use client";
import { useEffect, useState } from "react";
import { api } from "./api";
import { EntityForm, DeleteButton, type Field } from "./entity-form";
import type { Bootstrap } from "./types";
type Editor = {
  title: string;
  path: string;
  fields: Field[];
  values: Record<string, unknown>;
  editing?: boolean;
};
export default function BrandManager() {
  const [b, setB] = useState<Bootstrap>();
  const [error, setError] = useState("");
  const [editor, setEditor] = useState<Editor>();
  const load = () =>
    api<Bootstrap>("bootstrap")
      .then(setB)
      .catch((e) => setError(e.message));
  useEffect(() => {
    load();
  }, []);
  const brandFields: Field[] = [{ key: "name", label: "브랜드명" }];
  const countryFields = (editing = false): Field[] => [
    {
      key: "brandId",
      label: "브랜드",
      type: "select",
      disabled: editing,
      options: b?.brands.map((v) => ({ value: v.id, label: v.name })),
    },
    { key: "countryCode", label: "국가 코드 (예: VN)" },
    { key: "countryName", label: "국가명" },
  ];
  const admin = b?.actor.role === "ADMIN";
  return (
    <>
      <div className="page-head">
        <div>
          <p className="eyebrow">운영 기반</p>
          <h1>브랜드 · 국가 관리</h1>
          <p className="subtitle">
            브랜드별 국가 운영을 등록하고 캠페인의 시작점을 만듭니다.
          </p>
        </div>
        {admin && (
          <button
            disabled={!!editor}
            className="primary"
            onClick={() =>
              setEditor({
                title: "브랜드 등록",
                path: "brands",
                fields: brandFields,
                values: { name: "" },
              })
            }
          >
            + 브랜드 등록
          </button>
        )}
      </div>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {editor && (
        <EntityForm
          key={`${editor.path}-${editor.title}`}
          {...editor}
          onCancel={() => setEditor(undefined)}
          onSaved={async () => {
            await load();
            setEditor(undefined);
          }}
        />
      )}
      {b?.brands.length === 0 && (
        <p className="empty">
          등록된 브랜드가 없습니다. 브랜드를 등록해 주세요.
        </p>
      )}
      <div className="brand-grid">
        {b?.brands.map((brand) => (
          <section className="panel" key={brand.id}>
            <div className="section-head">
              <h2>
                {brand.name}{" "}
                {brand.isDemo && <span className="badge demo">DEMO</span>}
              </h2>
              {admin && (
                <div className="row-actions">
                  <button
                    disabled={!!editor}
                    className="quiet"
                    aria-label={`${brand.name} 수정`}
                    onClick={() =>
                      setEditor({
                        title: "브랜드 수정",
                        path: `brands/${brand.id}`,
                        fields: brandFields,
                        values: { name: brand.name, revision: brand.revision },
                        editing: true,
                      })
                    }
                  >
                    수정
                  </button>
                  <DeleteButton
                    disabled={!!editor}
                    path={`brands/${brand.id}`}
                    revision={brand.revision}
                    name={brand.name}
                    onDeleted={load}
                  />
                </div>
              )}
            </div>
            <ul className="country-list">
              {b.countries
                .filter((c) => c.brandId === brand.id)
                .map((c) => (
                  <li key={c.id}>
                    <div>
                      <strong>{c.countryName}</strong>
                      <span className="country-tag">{c.countryCode}</span>
                    </div>
                    {admin && (
                      <div className="row-actions">
                        <button
                          disabled={!!editor}
                          className="quiet"
                          aria-label={`${c.countryName} 수정`}
                          onClick={() =>
                            setEditor({
                              title: "국가 운영 수정",
                              path: `brand-countries/${c.id}`,
                              fields: countryFields(true),
                              values: {
                                brandId: c.brandId,
                                countryCode: c.countryCode,
                                countryName: c.countryName,
                                revision: c.revision,
                              },
                              editing: true,
                            })
                          }
                        >
                          수정
                        </button>
                        <DeleteButton
                          disabled={!!editor}
                          path={`brand-countries/${c.id}`}
                          revision={c.revision}
                          name={c.countryName}
                          onDeleted={load}
                        />
                      </div>
                    )}
                  </li>
                ))}
            </ul>
            {admin && (
              <button
                disabled={!!editor}
                className="secondary full"
                onClick={() =>
                  setEditor({
                    title: "국가 운영 등록",
                    path: "brand-countries",
                    fields: countryFields(),
                    values: {
                      brandId: brand.id,
                      countryCode: "",
                      countryName: "",
                    },
                  })
                }
              >
                + 국가 운영 등록
              </button>
            )}
          </section>
        ))}
      </div>
      <aside className="note">
        <strong>소속 데이터 보존</strong>
        <p>
          캠페인이 연결된 국가나 활동이 연결된 전략은 바로 삭제할 수 없습니다.
          하위 데이터를 먼저 정리해야 합니다.
        </p>
      </aside>
    </>
  );
}
