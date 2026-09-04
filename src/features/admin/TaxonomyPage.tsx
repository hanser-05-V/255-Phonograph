import {useCallback, useEffect, useRef, useState, type FormEvent} from 'react';
import type {TaxonomyItem} from '../../../shared/contracts';
import {adminApi} from '../../api/admin-api';
import {ApiError} from '../../api/http';
import {AsyncFormStatus} from './AsyncFormStatus';
import {ConfirmDialog} from './ConfirmDialog';

type TaxonomyKind = 'category' | 'tag';
type EditingItem = {id: string; kind: TaxonomyKind; name: string};
type DeletingItem = {id: string; kind: TaxonomyKind; name: string};

const copy = {
  category: {singular: '分类', plural: '分类'},
  tag: {singular: '标签', plural: '标签'},
} as const;

function errorMessage(error: unknown): string {
  return error instanceof ApiError ? error.message : '操作失败，请重试';
}

export function TaxonomyPage() {
  const [categories, setCategories] = useState<TaxonomyItem[]>([]);
  const [tags, setTags] = useState<TaxonomyItem[]>([]);
  const [newNames, setNewNames] = useState<Record<TaxonomyKind, string>>({
    category: '',
    tag: '',
  });
  const [editing, setEditing] = useState<EditingItem | null>(null);
  const [deleting, setDeleting] = useState<DeletingItem | null>(null);
  const [busyAction, setBusyAction] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const actionRequestRef = useRef<AbortController>(null);

  const loadKind = useCallback(async (kind: TaxonomyKind, signal?: AbortSignal) => {
    if (kind === 'category') {
      const items = await adminApi.listCategories(signal);
      if (!signal?.aborted) setCategories(items);
    } else {
      const items = await adminApi.listTags(signal);
      if (!signal?.aborted) setTags(items);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    if (
      typeof adminApi.listCategories !== 'function' ||
      typeof adminApi.listTags !== 'function'
    ) {
      setLoading(false);
      return () => controller.abort();
    }

    void Promise.all([
      loadKind('category', controller.signal),
      loadKind('tag', controller.signal),
    ]).catch((loadError: unknown) => {
      if (!controller.signal.aborted) setError(errorMessage(loadError));
    }).finally(() => {
      if (!controller.signal.aborted) setLoading(false);
    });
    return () => controller.abort();
  }, [loadKind]);

  useEffect(() => () => actionRequestRef.current?.abort(), []);

  function beginAction(action: string): AbortController | null {
    if (busyAction || actionRequestRef.current) return null;
    const controller = new AbortController();
    actionRequestRef.current = controller;
    setBusyAction(action);
    setError('');
    setStatus('');
    return controller;
  }

  function finishAction(controller: AbortController) {
    if (actionRequestRef.current === controller) actionRequestRef.current = null;
    if (!controller.signal.aborted) setBusyAction('');
  }

  async function handleCreate(kind: TaxonomyKind, event: FormEvent) {
    event.preventDefault();
    const controller = beginAction(`create-${kind}`);
    if (!controller) return;
    const name = newNames[kind];
    try {
      if (kind === 'category') {
        await adminApi.createCategory({name}, controller.signal);
      } else {
        await adminApi.createTag({name}, controller.signal);
      }
      await loadKind(kind, controller.signal);
      if (controller.signal.aborted) return;
      setNewNames((current) => ({...current, [kind]: ''}));
      setStatus(`${copy[kind].singular}已创建`);
    } catch (actionError) {
      if (!controller.signal.aborted) setError(errorMessage(actionError));
    } finally {
      finishAction(controller);
    }
  }

  async function handleRename(event: FormEvent) {
    event.preventDefault();
    if (!editing) return;
    const controller = beginAction(`rename-${editing.kind}-${editing.id}`);
    if (!controller) return;
    try {
      if (editing.kind === 'category') {
        await adminApi.renameCategory(editing.id, {name: editing.name}, controller.signal);
      } else {
        await adminApi.renameTag(editing.id, {name: editing.name}, controller.signal);
      }
      await loadKind(editing.kind, controller.signal);
      if (controller.signal.aborted) return;
      setStatus(`${copy[editing.kind].singular}已重命名`);
      setEditing(null);
    } catch (actionError) {
      if (!controller.signal.aborted) setError(errorMessage(actionError));
    } finally {
      finishAction(controller);
    }
  }

  async function handleDelete() {
    if (!deleting) return;
    const controller = beginAction(`delete-${deleting.kind}-${deleting.id}`);
    if (!controller) return;
    try {
      if (deleting.kind === 'category') {
        await adminApi.deleteCategory(deleting.id, controller.signal);
      } else {
        await adminApi.deleteTag(deleting.id, controller.signal);
      }
      await loadKind(deleting.kind, controller.signal);
      if (controller.signal.aborted) return;
      setStatus(`${copy[deleting.kind].singular}已删除`);
      setDeleting(null);
    } catch (actionError) {
      if (!controller.signal.aborted) {
        setError(errorMessage(actionError));
        setDeleting(null);
      }
    } finally {
      finishAction(controller);
    }
  }

  function renderSection(kind: TaxonomyKind, items: TaxonomyItem[]) {
    const label = copy[kind].singular;
    const creating = busyAction === `create-${kind}`;
    return (
      <section className="admin-taxonomy-section" aria-labelledby={`${kind}-heading`}>
        <h2 id={`${kind}-heading`}>{copy[kind].plural}</h2>
        <form className="admin-inline-form" onSubmit={(event) => void handleCreate(kind, event)}>
          <label htmlFor={`new-${kind}`}>新{label}名称</label>
          <div>
            <input
              aria-describedby={error ? 'taxonomy-error' : undefined}
              disabled={Boolean(busyAction)}
              id={`new-${kind}`}
              maxLength={50}
              onChange={(event) => setNewNames((current) => ({
                ...current,
                [kind]: event.target.value,
              }))}
              required
              value={newNames[kind]}
            />
            <button disabled={Boolean(busyAction)} type="submit">
              {creating ? `正在创建${label}…` : `创建${label}`}
            </button>
          </div>
        </form>
        {loading ? <p>正在加载{label}…</p> : null}
        {!loading && items.length === 0 ? <p>尚未创建{label}</p> : null}
        <ul className="admin-taxonomy-list">
          {items.map((item) => (
            <li key={item.id}>
              {editing?.id === item.id && editing.kind === kind ? (
                <form className="admin-rename-form" onSubmit={(event) => void handleRename(event)}>
                  <label htmlFor={`rename-${kind}-${item.id}`}>{label}名称：{item.name}</label>
                  <input
                    aria-describedby={error ? 'taxonomy-error' : undefined}
                    disabled={Boolean(busyAction)}
                    id={`rename-${kind}-${item.id}`}
                    maxLength={50}
                    onChange={(event) => setEditing({...editing, name: event.target.value})}
                    required
                    value={editing.name}
                  />
                  <button disabled={Boolean(busyAction)} type="submit">保存{label}名称</button>
                  <button disabled={Boolean(busyAction)} onClick={() => setEditing(null)} type="button">
                    取消重命名
                  </button>
                </form>
              ) : (
                <>
                  <span>{item.name}</span>
                  <div className="admin-taxonomy-list__actions">
                    <button
                      aria-label={`重命名${label}：${item.name}`}
                      disabled={Boolean(busyAction)}
                      onClick={() => setEditing({
                        id: item.id,
                        kind,
                        name: item.name,
                      })}
                      type="button"
                    >
                      重命名
                    </button>
                    <button
                      aria-label={`删除${label}：${item.name}`}
                      disabled={Boolean(busyAction)}
                      onClick={() => setDeleting({id: item.id, kind, name: item.name})}
                      type="button"
                    >
                      删除
                    </button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="admin-management-page">
      <header className="admin-section-heading">
        <h1>分类与标签</h1>
        <p>先统一整理名称，再将分类和标签用于歌曲资料。</p>
      </header>
      <AsyncFormStatus error={error} errorId="taxonomy-error" status={status} />
      <div className="admin-taxonomy-grid">
        {renderSection('category', categories)}
        {renderSection('tag', tags)}
      </div>
      {deleting ? (
        <ConfirmDialog
          busy={busyAction.startsWith('delete-')}
          confirmLabel={`确认删除${copy[deleting.kind].singular}`}
          description={deleting.kind === 'category'
            ? `删除“${deleting.name}”后，分类会从歌曲清空，但不会删除歌曲。`
            : `删除“${deleting.name}”后，标签关系会从歌曲移除，但不会删除歌曲。`}
          onCancel={() => setDeleting(null)}
          onConfirm={() => void handleDelete()}
          title={`确认删除${copy[deleting.kind].singular}`}
        />
      ) : null}
    </div>
  );
}
