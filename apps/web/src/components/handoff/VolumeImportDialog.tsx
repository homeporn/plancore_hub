'use client';

import { useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Upload } from 'lucide-react';
import { readSheetTable } from '@plancore/core';
import { createVolumesBatch, type VolumeInput } from '@plancore/data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { getBrowserClient } from '@/lib/supabase/browser';

// Volume fields the user maps Excel columns onto. `name` is required.
const FIELDS: { key: keyof VolumeInput; label: string; required?: boolean }[] = [
  { key: 'name', label: 'Наименование', required: true },
  { key: 'code', label: 'Код' },
  { key: 'mark', label: 'Марка' },
  { key: 'setName', label: 'Комплект' },
];

const SELECT_CLASS =
  'flex-1 rounded-md border border-input bg-transparent px-2 py-1.5 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

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
  const [busy, setBusy] = useState(false);

  function reset() {
    setHeaders([]);
    setRows([]);
    setMapping({});
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    file
      .arrayBuffer()
      .then((buf) => {
        const { headers: h, rows: r } = readSheetTable(buf);
        if (h.length === 0) {
          toast.error('Файл пуст или не содержит данных');
          return;
        }
        setHeaders(h);
        setRows(r);
        const nameGuess = h.find((x) => /наимен|назв|том|name/i.test(x));
        setMapping(nameGuess ? { name: nameGuess } : {});
      })
      .catch(() => toast.error('Не удалось прочитать файл Excel'));
  }

  async function doImport() {
    const nameCol = mapping.name;
    if (!nameCol) {
      toast.warning('Укажите колонку для «Наименование»');
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
      toast.warning('Нет строк с заполненным наименованием');
      return;
    }
    setBusy(true);
    try {
      const created = await createVolumesBatch(client, projectId, inputs);
      onImported(created.length);
      reset();
      onOpenChange(false);
    } catch (e) {
      toast.error('Не удалось импортировать тома', {
        description: e instanceof Error ? e.message : undefined,
      });
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
    >
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Импорт состава проекта</DialogTitle>
          <DialogDescription>
            Загрузите Excel и сопоставьте колонки с полями реестра томов.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              <Upload className="h-4 w-4" />
              {headers.length > 0 ? 'Другой файл' : 'Выбрать файл Excel'}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={handleFile}
            />
            {headers.length > 0 && (
              <span className="text-xs text-muted-foreground">Строк в файле: {rows.length}</span>
            )}
          </div>

          {headers.length > 0 && (
            <div className="space-y-2">
              {FIELDS.map((f) => (
                <div key={f.key} className="flex items-center gap-2">
                  <label className="w-32 text-sm">
                    {f.label}
                    {f.required && <span className="text-destructive"> *</span>}
                  </label>
                  <select
                    value={mapping[f.key] ?? ''}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [f.key]: e.target.value || undefined }))
                    }
                    className={SELECT_CLASS}
                  >
                    <option value="">— не импортировать —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}

              <div className="flex items-center gap-2 pt-1">
                <span className="text-xs text-muted-foreground">
                  Будет добавлено томов: {previewCount}
                </span>
                <Button
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
        </div>
      </DialogContent>
    </Dialog>
  );
}
