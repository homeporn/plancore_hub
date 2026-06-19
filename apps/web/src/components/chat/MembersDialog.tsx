'use client';

import { useEffect, useState, useCallback } from 'react';
import { toast } from 'sonner';
import { UserPlus, Trash2 } from 'lucide-react';
import {
  listProjectMembers,
  setMemberRole,
  addMemberByEmail,
  removeMember,
  type ProjectMember,
  type ProjectRole,
} from '@plancore/data';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getBrowserClient } from '@/lib/supabase/browser';

const ROLES: { value: ProjectRole; label: string }[] = [
  { value: 'owner', label: 'Владелец' },
  { value: 'admin', label: 'Администратор' },
  { value: 'planner', label: 'Планировщик' },
  { value: 'viewer', label: 'Наблюдатель' },
];

const SELECT_CLASS =
  'rounded-md border border-input bg-transparent px-2 py-1 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring';

interface Props {
  projectId: string;
  projectName?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Manage project members & roles (owner/admin only). */
export function MembersDialog({ projectId, projectName, open, onOpenChange }: Props) {
  const [members, setMembers] = useState<ProjectMember[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<ProjectRole>('planner');
  const [busy, setBusy] = useState(false);

  const reload = useCallback(() => {
    listProjectMembers(getBrowserClient(), projectId).then(setMembers).catch(() => { /* non-fatal */ });
  }, [projectId]);

  useEffect(() => { if (open) reload(); }, [open, reload]);

  async function changeRole(userId: string, next: ProjectRole) {
    try {
      await setMemberRole(getBrowserClient(), projectId, userId, next);
      setMembers((prev) => prev.map((m) => (m.userId === userId ? { ...m, role: next } : m)));
    } catch (e) {
      toast.error('Не удалось изменить роль', { description: e instanceof Error ? e.message : undefined });
    }
  }

  async function add() {
    const e = email.trim();
    if (!e) return;
    setBusy(true);
    try {
      await addMemberByEmail(getBrowserClient(), projectId, e, role);
      toast.success('Участник добавлен', { description: `${e} · ${role}` });
      setEmail('');
      reload();
    } catch (err) {
      toast.error('Не удалось добавить участника', { description: err instanceof Error ? err.message : undefined });
    } finally {
      setBusy(false);
    }
  }

  async function drop(userId: string) {
    try {
      await removeMember(getBrowserClient(), projectId, userId);
      setMembers((prev) => prev.filter((m) => m.userId !== userId));
    } catch (e) {
      toast.error('Не удалось удалить участника', { description: e instanceof Error ? e.message : undefined });
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Участники{projectName ? ` · ${projectName}` : ''}</DialogTitle>
          <DialogDescription>Назначайте роли и приглашайте участников по email.</DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          {members.map((m) => (
            <div key={m.userId} className="flex items-center gap-2 rounded-md border px-2 py-1.5">
              <span className="min-w-0 flex-1 truncate text-sm">{m.email}</span>
              <select
                value={m.role}
                onChange={(e) => void changeRole(m.userId, e.target.value as ProjectRole)}
                className={SELECT_CLASS}
                disabled={m.role === 'member'}
              >
                {ROLES.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                {m.role === 'member' && <option value="member">Участник (старое)</option>}
              </select>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => void drop(m.userId)} title="Удалить">
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>

        <div className="flex items-center gap-2 border-t pt-3">
          <Input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email участника"
            type="email"
            className="flex-1"
          />
          <select value={role} onChange={(e) => setRole(e.target.value as ProjectRole)} className={SELECT_CLASS}>
            {ROLES.filter((r) => r.value !== 'owner').map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
          </select>
          <Button size="sm" disabled={busy || !email.trim()} onClick={() => void add()}>
            <UserPlus className="h-4 w-4" /> Добавить
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
