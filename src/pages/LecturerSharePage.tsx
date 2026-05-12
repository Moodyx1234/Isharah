import { useEffect, useState } from 'react';
import { useParams, useSearchParams, Link } from 'react-router-dom';
import LecturerSharePanel from '@/components/share/LecturerSharePanel';

export default function LecturerSharePage() {
  const { locale = 'ar' } = useParams<{ locale: string }>();
  const [searchParams] = useSearchParams();
  const [sessionCode, setSessionCode] = useState(searchParams.get('code') ?? '');
  const [inputCode, setInputCode]     = useState('');
  const [confirmed, setConfirmed]     = useState(!!searchParams.get('code'));

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
        <h1 style={{ color: '#f0f4f8', fontSize: '1.8rem', margin: 0 }}>مشاركة المحتوى</h1>
        <p style={{ color: 'rgba(240,244,248,0.5)', margin: 0 }}>
          أدخل رمز الجلسة للبدء في مشاركة المحتوى مع طلابك
        </p>
        <div style={{ display: 'flex', gap: 12, width: '100%', maxWidth: 340 }}>
          <input
            value={inputCode}
            onChange={e => setInputCode(e.target.value.toUpperCase())}
            onKeyDown={e => e.key === 'Enter' && handleJoin()}
            placeholder="رمز الجلسة"
            maxLength={10}
            style={{
              flex: 1, padding: '12px 16px', background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(0,201,160,0.3)', borderRadius: 12, color: '#f0f4f8',
              fontFamily: 'Tajawal, sans-serif', fontSize: '1.1rem', letterSpacing: '0.1em',
              outline: 'none', textAlign: 'center',
            }}
          />
          <button
            onClick={handleJoin}
            style={{
              padding: '12px 24px', background: '#00C9A0', color: '#071118',
              border: 'none', borderRadius: 12, fontFamily: 'Tajawal, sans-serif',
              fontSize: '1rem', fontWeight: 700, cursor: 'pointer',
            }}
          >
            ابدأ
          </button>
        </div>
        <Link
          to={`/${locale}/lecturer`}
          style={{ color: 'rgba(240,244,248,0.4)', fontSize: '0.85rem', textDecoration: 'underline' }}
        >
          ← العودة للوحة التحكم
        </Link>
      </div>
    );
  }

  return <LecturerSharePanel sessionCode={sessionCode} />;
}
