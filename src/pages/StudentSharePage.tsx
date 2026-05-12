import { useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { type Role } from '@/hooks/useSession';
import StudentContentView from '@/components/share/StudentContentView';

const ROLE_FROM_PATH: Record<string, Role> = {
  deaf:    'deaf',
  blind:   'blind',
  sighted: 'sighted',
};

export default function StudentSharePage() {
  const { locale: _locale = 'ar', studentRole = 'sighted' } = useParams<{
    locale: string; studentRole: string;
  }>();
  const [searchParams] = useSearchParams();

  const role: Role = ROLE_FROM_PATH[studentRole] ?? 'sighted';
  const [sessionCode, setSessionCode] = useState(searchParams.get('code') ?? '');
  const [inputCode, setInputCode]     = useState('');
  const [userName, setUserName]       = useState(searchParams.get('name') ?? '');
  const [confirmed, setConfirmed]     = useState(!!searchParams.get('code'));

  const userId = `student_${Date.now()}`;

  const ROLE_LABEL: Partial<Record<Role, string>> = {
    deaf:    'أصم',
    blind:   'كفيف',
    sighted: 'مبصر',
  };
  const ROLE_ACCENT: Partial<Record<Role, string>> = {
    deaf:    '#00C9A0',
    blind:   '#F5A623',
    sighted: '#818CF8',
  };
  const accent = ROLE_ACCENT[role] ?? '#00C9A0';

  const handleJoin = () => {
    const code = inputCode.trim().toUpperCase();
    if (code.length >= 4) { setSessionCode(code); setConfirmed(true); }
  };

  if (!confirmed) {
    return (
      <div style={{
        minHeight: '100vh', background: '#071118', display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontFamily: 'Tajawal, sans-serif',
        direction: 'rtl', flexDirection: 'column', gap: 24, padding: 24,
      }}>
        <div style={{
          width: 60, height: 60, borderRadius: '50%',
          background: `${accent}20`, border: `2px solid ${accent}55`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.8rem',
        }}>
          {role === 'deaf' ? '🤟' : role === 'blind' ? '👁' : '📖'}
        </div>
        <h1 style={{ color: '#f0f4f8', fontSize: '1.6rem', margin: 0 }}>
          الانضمام كطالب {ROLE_LABEL[role] ?? role}
        </h1>
        <p style={{ color: 'rgba(240,244,248,0.5)', margin: 0, textAlign: 'center', maxWidth: 320 }}>
          أدخل رمز الجلسة للانضمام ورؤية المحتوى المشترك
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, width: '100%', maxWidth: 340 }}>
          <input
            value={userName}
            onChange={e => setUserName(e.target.value)}
            placeholder="اسمك (اختياري)"
            style={{
              padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.12)', borderRadius: 12, color: '#f0f4f8',
              fontFamily: 'Tajawal, sans-serif', fontSize: '1rem', outline: 'none',
            }}
          />
          <div style={{ display: 'flex', gap: 12 }}>
            <input
              value={inputCode}
              onChange={e => setInputCode(e.target.value.toUpperCase())}
              onKeyDown={e => e.key === 'Enter' && handleJoin()}
              placeholder="رمز الجلسة"
              maxLength={10}
              style={{
                flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
                border: `1px solid ${accent}55`, borderRadius: 12, color: '#f0f4f8',
                fontFamily: 'Tajawal, sans-serif', fontSize: '1.1rem',
                letterSpacing: '0.1em', outline: 'none', textAlign: 'center',
              }}
            />
            <button
              onClick={handleJoin}
              style={{
                padding: '12px 24px', background: accent, color: '#071118',
                border: 'none', borderRadius: 12, fontFamily: 'Tajawal, sans-serif',
                fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
              }}
            >
              انضم
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <StudentContentView
      sessionCode={sessionCode}
      role={role}
      userId={userId}
      userName={userName || (ROLE_LABEL[role] ?? role)}
    />
  );
}
