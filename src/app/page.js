'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';

// Supabase 환경변수 설정
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 원본 말씀 구조 정의
const CORRECT_WORDS = [
  "이스라엘아", "들으라", "우리 하나님", "여호와는", "오직 유일한", "여호와이시니",
  "너는", "마음을 다하고", "뜻을 다하고", "힘을 다하여", "네 하나님", "여호와를", "사랑하라"
];

export default function WordPuzzleGame() {
  const [gameState, setGameState] = useState('READY'); // READY, PLAYING, FINISHED, RANKING
  const [words, setWords] = useState([]);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [timerInterval, setTimerInterval] = useState(null);
  
  const [department, setDepartment] = useState('');
  const [name, setName] = useState('');
  const [leaderboard, setLeaderboard] = useState([]);
  
  const [showHint, setShowHint] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  // 1. 단어 뒤섞기 (무작위 셔플)
  const startChallenge = () => {
    let shuffled;
    while (true) {
      shuffled = [...CORRECT_WORDS]
        .map((word) => ({ text: word, sort: Math.random() }))
        .sort((a, b) => a.sort - b.sort)
        .map((item) => item.text);
      
      if (JSON.stringify(shuffled) !== JSON.stringify(CORRECT_WORDS)) break;
    }
    setWords(shuffled);
    setElapsedTime(0);
    setGameState('PLAYING');
    setShowHint(false);
  };

  // 2. 타이머 가동
  useEffect(() => {
    if (gameState === 'PLAYING') {
      const start = performance.now();
      const interval = setInterval(() => {
        setElapsedTime(((performance.now() - start) / 1000).toFixed(2));
      }, 50);
      setTimerInterval(interval);
      return () => clearInterval(interval);
    }
  }, [gameState]);

  // 3. 정답 검증 로직
  const checkAnswer = (currentWords) => {
    const isCorrect = currentWords.every((word, idx) => word === CORRECT_WORDS[idx]);
    if (isCorrect) {
      if (timerInterval) clearInterval(timerInterval);
      setGameState('FINISHED');
    }
  };

  // --- 드래그 앤 드롭 이벤트 핸들러 ---
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault(); 
    if (draggedIndex === null || draggedIndex === index) return;

    const nextWords = [...words];
    const draggedItem = nextWords[draggedIndex];
    nextWords.splice(draggedIndex, 1);
    nextWords.splice(index, 0, draggedItem);
    
    setDraggedIndex(index);
    setWords(nextWords);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    checkAnswer(words); 
  };

  // 터치 스크린 화살표 버튼 작동
  const moveWordRow = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= words.length) return;
    const nextWords = [...words];
    const temp = nextWords[index];
    nextWords[index] = nextWords[targetIndex];
    nextWords[targetIndex] = temp;
    setWords(nextWords);
    
    checkAnswer(nextWords);
  };

  // 4. Supabase 데이터 통신
  const handleSubmitScore = async (e) => {
    e.preventDefault();
    if (!department || !name) return;

    await supabase.from('leaderboard').insert([
      { department, name, elapsed_time: parseFloat(elapsedTime) }
    ]);

    fetchLeaderboard();
  };

  const fetchLeaderboard = async () => {
    const { data } = await supabase
      .from('leaderboard')
      .select('*')
      .order('elapsed_time', { ascending: true })
      .limit(10);
    
    setLeaderboard(data || []);
    setGameState('RANKING');
  };

  // 첫 페이지에서 바로 랭킹을 보기 위한 함수
  const handleViewRanking = () => {
    fetchLeaderboard();
  };

  // 5. 카카오톡 링크 공유
  const shareToKakao = () => {
    if (window.Kakao) {
      window.Kakao.Link.sendDefault({
        objectType: 'feed',
        content: {
          title: '🔥 말씀 퍼즐 타임어택 성공!',
          description: `"${name}" 성도님이 "다시 사랑하라" 말씀을 ${elapsedTime}초 만에 완성했습니다! 당신도 도전해보세요!`,
          imageUrl: 'https://your-domain.com/share-banner.png', 
          link: { mobileWebUrl: window.location.href, webUrl: window.location.href },
        },
        buttons: [{ title: '나도 도전하기', link: { mobileWebUrl: window.location.href, webUrl: window.location.href } }]
      });
    } else {
      navigator.clipboard.writeText(`[다시 사랑하라 챌린지]\n내가 세운 기록은 ${elapsedTime}초입니다!\n지금 참여하기: ${window.location.href}`);
      alert('공유 문구가 복사되었습니다! 카톡방에 붙여넣어 보세요.');
    }
  };

  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-between p-4 shadow-lg select-none">
      <header className="bg-indigo-700 text-white p-5 rounded-2xl text-center shadow-md">
        <h1 className="text-2xl font-bold">"다시 사랑하라"</h1>
        <p className="text-xs text-indigo-200 mt-1">창립기념주일 말씀 퍼즐 챌린지</p>
      </header>

      <main className="flex-grow flex flex-col justify-center py-6">
        {gameState === 'READY' && (
          <div className="text-center px-4">
            <div className="text-5xl mb-4">❤️</div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">말씀 타임어택</h2>
            <p className="text-slate-500 mb-6 text-sm leading-relaxed">
              신명기 6:4~5 말씀 조각이 섞여있습니다.<br />
              카드를 드래그하여 올바른 순서로 정렬하세요!
            </p>
            <div className="space-y-3">
              <button 
                onClick={startChallenge} 
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-xl text-lg shadow transition"
              >
                챌린지 시작하기 ⏱️
              </button>
              {/* 첫 페이지 명예의 전당 버튼 추가 */}
              <button 
                onClick={handleViewRanking} 
                className="w-full bg-white hover:bg-slate-100 text-slate-700 font-semibold py-3 rounded-xl text-sm border border-slate-200 shadow-sm transition"
              >
                🏆 명예의 전당 (Top 10) 기록보기
              </button>
            </div>
          </div>
        )}

        {gameState === 'PLAYING' && (
          <div>
            <div className="flex justify-between items-center mb-4 px-2">
              <div className="text-2xl font-mono font-bold text-indigo-600">{elapsedTime} 초</div>
              <button 
                onClick={() => setShowHint(true)} 
                className="bg-amber-100 hover:bg-amber-200 text-amber-800 text-xs font-bold px-3 py-2 rounded-lg transition border border-amber-200 flex items-center space-x-1"
              >
                <span>💡 말씀 힌트 보기</span>
              </button>
            </div>

            <p className="text-[11px] text-slate-400 text-center mb-2">💡 카드를 길게 누른 채 위아래로 끌어서 움직이세요.</p>
            
            <div className="space-y-2 max-h-[55vh] overflow-y-auto bg-slate-100 p-2 rounded-xl border border-slate-200">
              {words.map((word, idx) => (
                <div 
                  key={idx} 
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`bg-white p-3 rounded-lg flex justify-between items-center shadow-sm border-2 cursor-grab active:cursor-grabbing transition-all ${
                    draggedIndex === idx ? 'border-indigo-500 bg-indigo-50 scale-102 opacity-50' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-slate-300 text-xs font-mono">☰</span>
                    <span className="text-slate-800 font-medium text-sm">{word}</span>
                  </div>
                  <div className="flex space-x-1 md:hidden">
                    <button onClick={() => moveWordRow(idx, -1)} disabled={idx === 0} className="p-1 bg-slate-50 text-[10px] rounded border disabled:opacity-20">▲</button>
                    <button onClick={() => moveWordRow(idx, 1)} disabled={idx === words.length - 1} className="p-1 bg-slate-50 text-[10px] rounded border disabled:opacity-20">▼</button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {gameState === 'FINISHED' && (
          <div className="bg-white p-6 rounded-2xl shadow border text-center">
            <h2 className="text-xl font-bold text-emerald-600">🎉 말씀 완성 성공!</h2>
            <p className="text-3xl font-mono font-black my-4 text-slate-800">{elapsedTime} 초</p>
            
            <form onSubmit={handleSubmitScore} className="space-y-3 text-left">
              <div>
                <label className="text-xs text-slate-500 font-bold">소속</label>
                <input type="text" placeholder="예: 청년부 / 3교구" value={department} onChange={e => setDepartment(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
              </div>
              <div>
                <label className="text-xs text-slate-500 font-bold">이름</label>
                <input type="text" placeholder="성함을 입력하세요" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg text-sm" required />
              </div>
              <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-lg font-bold text-sm shadow">
                내 기록 랭킹에 등록하기 🏅
              </button>
            </form>
          </div>
        )}

        {gameState === 'RANKING' && (
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-3">🏆 실시간 명예의 전당 (Top 10)</h2>
            <div className="space-y-1.5 mb-6 max-h-[40vh] overflow-y-auto">
              {leaderboard.map((player, index) => (
                <div key={player.id} className="flex justify-between p-3 bg-white border rounded-xl text-sm items-center shadow-sm">
                  <span className="font-bold text-indigo-600">{index + 1}위. {player.name} <span className="text-xs text-slate-400 font-normal">({player.department})</span></span>
                  <span className="font-mono font-semibold text-slate-700">{player.elapsed_time}초</span>
                </div>
              ))}
              {leaderboard.length === 0 && (
                <p className="text-sm text-slate-400 text-center py-8">아직 등록된 기록이 없습니다.<br/>첫 번째 주인공이 되어보세요!</p>
              )}
            </div>
            <div className="space-y-2">
              <button onClick={() => setGameState('READY')} className="w-full bg-slate-800 text-white py-3 rounded-xl text-sm font-medium hover:bg-slate-900 transition">
                첫 화면으로 돌아가기 🔄
              </button>
            </div>
          </div>
        )}
      </main>

      {showHint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white p-6 rounded-2xl max-w-sm w-full shadow-xl">
            <h3 className="font-bold text-indigo-700 mb-3 flex items-center">
              <span>💡 전체 말씀 구절</span>
            </h3>
            <div className="bg-slate-50 p-4 rounded-xl text-sm text-slate-700 leading-relaxed border mb-4 font-medium">
              <p className="mb-2"><strong>신명기 6장 4절</strong><br />"이스라엘아 들으라 우리 하나님 여호와는 오직 유일한 여호와이시니"</p>
              <p><strong>5절</strong><br />"너는 마음을 다하고 뜻을 다하고 힘을 다하여 네 하나님 여호와를 사랑하라"</p>
            </div>
            <button 
              onClick={() => setShowHint(false)}
              className="w-full bg-slate-800 text-white py-2.5 rounded-xl text-sm font-bold shadow hover:bg-slate-950 transition"
            >
              닫고 계속하기
            </button>
          </div>
        </div>
      )}

      <footer className="text-center text-[11px] text-slate-400 border-t pt-3">
        창립기념주일 "다시 사랑하라" 챌린지
      </footer>
    </div>
  );
}