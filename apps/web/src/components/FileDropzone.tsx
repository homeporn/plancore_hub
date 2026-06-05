'use client';

import { useCallback, useRef, useState } from 'react';
import { UploadCloud } from 'lucide-react';
import { cn } from '@/lib/utils';

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
      className={cn(
        'flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-12 text-center transition-colors',
        dragOver ? 'border-primary bg-accent' : 'border-border hover:border-muted-foreground',
        disabled && 'pointer-events-none opacity-60',
      )}
    >
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary">
        <UploadCloud className="h-6 w-6 text-muted-foreground" />
      </span>
      <p className="text-sm font-medium">Перетащите файл Excel сюда или нажмите для выбора</p>
      <p className="text-xs text-muted-foreground">Поддерживаются .xlsx и .xls</p>
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
