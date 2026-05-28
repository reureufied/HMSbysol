import React, { useState } from 'react';
import { supabase } from '../supabaseClient';

const Auth = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [verifyPending, setVerifyPending] = useState(false); // 인증 대기 화면

  const switchMode = () => {
    setIsLogin(!isLogin);
    setPassword('');
    setConfirmPassword('');
    setNickname('');
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    if (!isLogin) {
      if (!nickname.trim()) return alert('이름을 입력해주세요.');
      if (password.length < 6) return alert('비밀번호는 6자 이상이어야 합니다.');
      if (password !== confirmPassword) return alert('비밀번호가 일치하지 않습니다.');
    }
    setLoading(true);
    if (isLogin) {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        if (error.message.toLowerCase().includes('email not confirmed')) {
          alert('이메일 인증이 완료되지 않았습니다.\n가입 시 받은 인증 메일을 확인해주세요.');
        } else {
          alert('로그인 실패: ' + error.message);
        }
      }
    } else {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nickname: nickname.trim() } }
      });
      if (error) {
        alert('가입 실패: ' + error.message);
      } else {
        setVerifyPending(true); // 인증 대기 화면으로 전환
      }
    }
    setLoading(false);
  };

  const handleResend = async () => {
    setLoading(true);
    const { error } = await supabase.auth.resend({ type: 'signup', email });
    if (error) alert('재발송 실패: ' + error.message);
    else alert('인증 이메일을 다시 발송했습니다.');
    setLoading(false);
  };

  const inputStyle = {
    padding: '12px', borderRadius: '8px', border: '1px solid #CED4DA',
    fontSize: '14px', fontFamily: 'inherit', outline: 'none',
    transition: 'border-color 0.15s', width: '100%', boxSizing: 'border-box'
  };

  // 인증 이메일 발송 후 대기 화면
  if (verifyPending) {
    return (
      <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6F8' }}>
        <div style={{ background: '#FFF', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.09)', width: '340px', textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📬</div>
          <h2 style={{ fontSize: '18px', fontWeight: 700, color: '#343A40', marginBottom: '10px' }}>이메일을 확인해주세요</h2>
          <p style={{ fontSize: '14px', color: '#495057', lineHeight: 1.6, marginBottom: '6px' }}>
            <strong style={{ color: '#343A40' }}>{email}</strong>으로<br />인증 링크를 발송했습니다.
          </p>
          <p style={{ fontSize: '13px', color: '#929AA3', marginBottom: '28px', lineHeight: 1.5 }}>
            링크를 클릭하면 자동으로 로그인됩니다.<br />메일이 없다면 스팸함도 확인해보세요.
          </p>
          <button
            onClick={handleResend}
            disabled={loading}
            style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid #CED4DA', background: '#F8F9FA', fontWeight: 600, cursor: 'pointer', fontSize: '14px', fontFamily: 'inherit', color: '#495057', marginBottom: '10px' }}
          >
            {loading ? '발송 중...' : '인증 메일 다시 받기'}
          </button>
          <button
            onClick={() => { setVerifyPending(false); setIsLogin(true); }}
            style={{ background: 'none', border: 'none', color: '#868E96', fontSize: '13px', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            로그인 화면으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6F8' }}>
      <div style={{ background: '#FFF', padding: '40px', borderRadius: '16px', boxShadow: '0 4px 24px rgba(0,0,0,0.09)', width: '340px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '24px', margin: '0 0 6px 0', color: '#343A40' }}><span style={{ fontSize: '28px' }}>💛</span> 노쌤반</h1>
        <p style={{ fontSize: '13px', color: '#929AA3', marginBottom: '28px' }}>숙제·성적 관리 시스템</p>
        <h2 style={{ fontSize: '17px', color: '#495057', marginBottom: '20px', fontWeight: 700 }}>
          {isLogin ? '선생님 로그인' : '무료 회원가입'}
        </h2>

        <form onSubmit={handleAuth} style={{ display: 'flex', flexDirection: 'column', gap: '10px', textAlign: 'left' }}>
          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>이름 / 닉네임</label>
              <input type="text" placeholder="선생님 이름을 입력해주세요" value={nickname} onChange={e => setNickname(e.target.value)} required={!isLogin} style={inputStyle} />
            </div>
          )}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>이메일</label>
            <input type="email" placeholder="이메일 주소" value={email} onChange={e => setEmail(e.target.value)} required style={inputStyle} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>비밀번호</label>
            <input type="password" placeholder="6자 이상" value={password} onChange={e => setPassword(e.target.value)} required style={inputStyle} />
          </div>
          {!isLogin && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <label style={{ fontSize: '12px', fontWeight: 600, color: '#495057' }}>비밀번호 확인</label>
              <input type="password" placeholder="비밀번호를 한 번 더 입력해주세요" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} required={!isLogin} style={inputStyle} />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            style={{ background: '#343A40', color: '#FFF', padding: '13px', borderRadius: '8px', border: 'none', fontWeight: 700, cursor: 'pointer', fontSize: '15px', marginTop: '8px', fontFamily: 'inherit' }}
          >
            {loading ? '처리 중...' : (isLogin ? '로그인하기' : '가입하기')}
          </button>
        </form>

        <p style={{ marginTop: '20px', fontSize: '13px', color: '#868E96' }}>
          {isLogin ? '아직 계정이 없으신가요? ' : '이미 계정이 있으신가요? '}
          <span onClick={switchMode} style={{ color: '#495057', cursor: 'pointer', fontWeight: 700, textDecoration: 'underline' }}>
            {isLogin ? '가입하기' : '로그인하기'}
          </span>
        </p>
      </div>
    </div>
  );
};

export default Auth;
