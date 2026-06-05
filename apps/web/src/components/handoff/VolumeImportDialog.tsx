'use client';

import { useMemo, useRef, useState } from 'react';
import { readSheetTable } from '@plancore/core';
import { createVolumesBatch, type VolumeInput } from '@plancore/data';
import { Alert, Button, Dialog } from '@plancore/ui';
import { getBrowserClient } from '@/lib/supabase/browser';

// Volume fields the user maps Excel columns onto. `name` is required.
const FIELDS: { key: keyof VolumeInput; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Наименование', required: true },
  { key: 'code', label: 'Код' },
  { key: 'mark', label: 'Марка' },
  { key: 'setName', label: 'Комплект' },
];

interface Props {
  projectId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful import (e.g. to refresh the registry). */
  onImported: (count: number) => void;
}

/** Import the project composition from Excel into the volume registry (Wave G). */
export function VolumeImportDialog({ projectId, open, onOpenChange, onImported }: Props) {
  const client = useMemo(() => getBrowserClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Partial<Record<keyof VolumeInput, string>>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function reset() {
    setHeaders([]);
    setRows([]);
    setMapping({});
    setError(null);
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setError(null);
    file
      .arrayBuffer()
      .then((buf) => {
        const { headers: h, rows: r } = readSheetTable(buf);
        if (h.length === 0) {
          setError('Файл пуст или не содержит данных.');
          return;
        }
        setHeaders(h);
        setRows(r);
        // Pre-guess the name column by header text.
        const nameGuess = h.find((x) => /наимен|назв|том|name/i.test(x));
        setMapping(nameGuess ? { name: nameGuess } : {});
      })
      .catch(() => setError('Не удалось прочитать файл Excel.'));
  }

  async function doImport() {
    const nameCol = mapping.name;
    if (!nameCol) {
      setError('Укажите колонку для «Наименование».');
      return;
    }
    const inputs: VolumeInput[] = rows
      .map((row, i): VolumeInput => ({
        name: row[nameCol] ?? '',
        code: mapping.code ? row[mapping.code] : undefined,
        mark: mapping.mark ? row[mapping.mark] : undefined,
        setName: mapping.setName ? row[mapping.setName] : undefined,
        sortOrder: i,
      }))
      .filter((v) => v.name.length > 0);

    if (inputs.length === 0) {
      setError('Нет строк с заполненным наименованием.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const created = await createVolumesBatch(client, projectId, inputs);
      onImported(created.length);
      reset();
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось импортировать тома');
    } finally {
      setBusy(false);
    }
  }

  const previewCount = mapping.name
    ? rows.filter((r) => (r[mapping.name!] ?? '').length > 0).length
    : 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
      title="Импорт состава проекта"
      description="Загрузите Excel и сопоставьте колонки с полями реестра томов."
      className="max-w-2xl"
    >
      <div className="space-y-4">
        <div>
          <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
            {headers.length > 0 ? 'Выбрать другой файл' : 'Выбрать файл Excel'}
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls"
            className="hidden"
            onChange={handleFile}
          />
          {headers.length > 0 && (
            <span className="ml-2 text-xs text-[var(--muted)]">Строк в файле: {rows.length}</span>
          )}
        </div>

        {headers.length > 0 && (
          <div className="space-y-2">
            {FIELDS.map((f) => (
              <div key={f.key} className="flex items-center gap-2">
                <label className="w-32 text-sm">
                  {f.label}
                  {f.required && <span className="text-[var(--critical)]"> *</span>}
                </label>
                <select
                  value={mapping[f.key] ?? ''}
                  onChange={(e) =>
                    setMapping((prev) => ({ ...prev, [f.key]: e.target.value || undefined }))
                  }
                  className="flex-1 rounded-md border border-[var(--border)] px-2 py-1.5 text-sm"
                >
                  <option value="">— не импортировать —</option>
                  {headers.map((h) => (
                    <option key={h} value={h}>
                      {h}
                    </option>
                  ))}
                </select>
              </div>
            ))}

            <div className="flex items-center gap-2 pt-1">
              <span className="text-xs text-[var(--muted)]">
                Будет добавлено томов: {previewCount}
              </span>
              <Button
                variant="primary"
                size="sm"
                className="ml-auto"
                disabled={busy || previewCount === 0}
                onClick={() => void doImport()}
              >
                {busy ? '…' : 'Импортировать'}
              </Button>
            </div>
          </div>
        )}

        {error && <Alert tone="critical">{error}</Alert>}
      </div>
    </Dialog>
  );
}
