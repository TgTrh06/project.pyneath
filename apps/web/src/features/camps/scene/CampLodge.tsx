import { appearanceIndex, wandererColors } from '../../../shared/scene/wandererAppearance';
import { CampPanel } from "./CampPanel";
import { useState, type ReactNode } from 'react';
import { lodgeMembers, type LodgeMember } from './lodgeState';
import { MartenMascot } from '../../../shared/components/marten/MartenMascot';
import '../../../shared/scene/lodge.css';
import type { CampForest } from '@pyneath/contracts';

const emptyMembers: LodgeMember[] = [];

type Props = {
  header?: ReactNode;
  feedback?: ReactNode;
  members?: LodgeMember[];
  accountId: string;
  selected: string[];
  disabled: boolean;
  archived: boolean;
  forest?: CampForest | null;
  forestLoading?: boolean;
  forestError?: string;
  onToggleMember: (id: string) => void;
  onCompose: () => void;
  onPacts: () => void;
  onManage?: () => void;
};

export function CampLodge({
  header,
  feedback,
  members = emptyMembers,
  accountId,
  selected,
  disabled,
  archived,
  onToggleMember,
  onCompose,
  onPacts,
  onManage,
}: Props) {
  const [rosterOpen, setRosterOpen] = useState(false);
  const [inspected, setInspected] = useState<string | null>(null);
  const people = lodgeMembers(members);
  const person = people.find(member => member.accountId === inspected);

  function inspect(id: string) {
    setInspected(id);
    onToggleMember(id);
  }

  return (
    <section className="camp-lodge camp-lodge--2d" aria-label="Không gian Camp">
      <div className="camp-top-overlay">{header}</div>
      {feedback}
      <div className="camp-gathering-card" style={{ display: 'flex', flexDirection: 'column', gap: '16px', padding: '24px', background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 'var(--radius-panel)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <MartenMascot size="md" pose={archived ? 'rest' : 'idle'} />
          <div>
            <p className="camp-gathering-caption" style={{ margin: 0, fontWeight: 600 }}>Có mặt cùng nhau là đủ.</p>
            <p className="field-hint" style={{ margin: '4px 0 0' }}>
              {archived
                ? 'Camp đã lưu trữ. Những cuộc hẹn vẫn ở bảng hẹn.'
                : 'Chọn thành viên hoặc hẹn một chặng tập trung cùng nhau.'}
            </p>
          </div>
        </div>

        <ul className="lodge-roster" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '10px', margin: 0, padding: 0, listStyle: 'none' }}>
          {people.map(member => {
            const mine = member.accountId === accountId;
            const chosen = selected.includes(member.accountId);
            return (
              <li key={member.accountId}>
                <button
                  type="button"
                  disabled={disabled || mine}
                  aria-pressed={chosen}
                  onClick={() => inspect(member.accountId)}
                  aria-label={`${member.displayName ?? 'Wanderer'}${mine ? ', bạn' : ''}${chosen ? ', đã chọn' : ''}`}
                  style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 12px', borderRadius: 'var(--radius-control)', border: '1px solid var(--line)', background: chosen ? 'var(--wash)' : 'var(--surface-raised)', textAlign: 'left' }}
                >
                  <span
                    className="lodge-member-mark"
                    style={{ backgroundColor: `color-mix(in srgb, ${wandererColors[appearanceIndex(member.accountId)]} 72%, white)` }}
                    aria-hidden="true"
                  >
                    {chosen ? '✓' : (member.displayName?.trim().slice(0, 1) ?? 'W')}
                  </span>
                  <span>
                    <strong style={{ display: 'block', fontSize: '.875rem' }}>{member.displayName ?? 'Wanderer'}</strong>
                    <small className="field-hint">{mine ? 'Bạn' : member.role === 'owner' ? 'Chủ nhóm' : 'Thành viên'}{chosen ? ' · Đã chọn' : ''}</small>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {person && !rosterOpen && (
          <p className="camp-selection-note field-hint" role="status" style={{ margin: 0 }}>
            {person.displayName ?? "Wanderer"}{selected.includes(person.accountId) ? " · Đã chọn để hẹn" : " · Thành viên Camp"}
          </p>
        )}

        <nav className="camp-dock" aria-label="Thao tác trong Camp" style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
          {!archived && (
            <button type="button" className="primary camp-start" disabled={disabled} onClick={onCompose}>
              Hẹn một chặng <span aria-hidden="true">↗</span>
            </button>
          )}
          <button type="button" className="secondary" onClick={() => setRosterOpen(true)}>
            Thành viên <span className="camp-count">{people.length}</span>
          </button>
          <button type="button" className="secondary" onClick={onPacts}>Bảng hẹn</button>
          {onManage && <button type="button" className="secondary" onClick={onManage}>Quản lý</button>}
        </nav>
      </div>

      {rosterOpen && (
        <CampPanel title="Những người trong Camp" onClose={() => setRosterOpen(false)}>
          <div className="lodge-roster-heading"><h3>Những người trong Camp</h3><span>{people.length}/8</span></div>
          <p className="field-hint lodge-presence-note">Danh sách thành viên Camp, không biểu thị trạng thái online.</p>
          <ul className="lodge-roster">
            {people.map(member => {
              const mine = member.accountId === accountId;
              const chosen = selected.includes(member.accountId);
              return (
                <li key={member.accountId}>
                  <button type="button" disabled={disabled || mine} aria-pressed={chosen} onClick={() => inspect(member.accountId)} aria-label={`${member.displayName ?? 'Wanderer'}${mine ? ', bạn' : ''}${chosen ? ', đã chọn' : ''}`}>
                    <span className="lodge-member-mark" style={{ backgroundColor: `color-mix(in srgb, ${wandererColors[appearanceIndex(member.accountId)]} 72%, white)` }} aria-hidden="true">{chosen ? '✓' : (member.displayName?.trim().slice(0, 1) ?? 'W')}</span>
                    <span><strong>{member.displayName ?? 'Wanderer'}</strong><small>{mine ? 'Bạn' : member.role === 'owner' ? 'Chủ nhóm' : 'Thành viên'}{chosen ? ' · Đã chọn' : ''}</small></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </CampPanel>
      )}
    </section>
  );
}
