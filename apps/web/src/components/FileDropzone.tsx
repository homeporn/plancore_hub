'use client';

import { useCallback, useRef, useState } from 'react';

interface FileDropzoneProps {
  onFile: (buffer: ArrayBuffer, fileName: string) => void;
  disabled?: boolean;
}

/** Thin presentational dropzone — no business logic, just hands back bytes. */
export function FileDropzone({ onFile, disabled }: FileDropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      const buffer = await file.arrayBuffer();
      onFile(buffer, file.name);
    },
    [onFile],
  );

  return (
    <div
      onClick={() => !disabled && inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        if (disabled) return;
        void handleFile(e.dataTransfer.files[0]);
      }}
      className={`flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors ${
        dragOver
          ? 'border-[var(--info)] bg-blue-50'
          : 'border-[var(--border)] hover:border-[var(--muted)]'
      } ${disabled ? 'pointer-events-none opacity-60' : ''}`}
    >
      <span className="text-3xl">📥</span>
      <p className="text-sm font-medium">
        Перетащите файл Excel сюда или нажмите для выбора
      </p>
      <p className="text-xs text-[var(--muted)]">Поддерживаются .xlsx и .xls</p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        className="hidden"
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
    </div>
  );
}
