'use client';

import { useState, useEffect, useRef } from 'react';
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

  // 모바일 터치 좌표 추적용 Ref
  const listRef = useRef(null);

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

  const handleStopGame = () => {
    const isConfirm = window.confirm("진행 중인 게임을 중단하고 첫 화면으로 돌아가시겠습니까?\n(현재까지의 기록은 저장되지 않습니다.)");
    if (isConfirm) {
      if (timerInterval) clearInterval(timerInterval);
      setWords([]);
      setElapsedTime(0);
      setGameState('READY');
    }
  };

  // --- PC 마우스 드래그 앤 드롭 핸들러 ---
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

  // --- 📱 모바일 초고속 터치 드래그 (핸들 전용 제어) ---
  const handleTouchStart = (index) => {
    setDraggedIndex(index);
  };

  const handleTouchMove = (e) => {
    if (draggedIndex === null) return;
    
    // 드래그 핸들을 잡았을 때만 화면 스크롤을 막아 부드럽게 움직이게 조절
    if (e.cancelable) e.preventDefault(); 

    const touchLocation = e.touches[0];
    if (!listRef.current) return;

    // 현재 손가락 위치 아래에 있는 요소 감지
    const targetElement = document.elementFromPoint(touchLocation.clientX, touchLocation.clientY);
    const rowElement = targetElement?.closest('[data-index]');
    
    if (rowElement) {
      const targetIndex = parseInt(rowElement.getAttribute('data-index'), 10);
      if (targetIndex !== draggedIndex && !isNaN(targetIndex)) {
        const nextWords = [...words];
        const draggedItem = nextWords[draggedIndex];
        nextWords.splice(draggedIndex, 1);
        nextWords.splice(targetIndex, 0, draggedItem);
        
        setDraggedIndex(targetIndex);
        setWords(nextWords);
      }
    }
  };

  const handleTouchEnd = () => {
    setDraggedIndex(null);
    checkAnswer(words); 
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

  const handleViewRanking = () => {
    fetchLeaderboard();
  };

  return (
    <div className="w-full max-w-md mx-auto min-h-screen bg-slate-50 flex flex-col justify-between p-4 shadow-lg select-none box-border">
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
          <div className="w-full">
            <div className="flex justify-between items-center mb-4 px-1">
              <div className="text-2xl font-mono font-bold text-indigo-600">{elapsedTime} 초</div>
              
              <div className="flex space-x-1.5">
                <button 
                  onClick={() => setShowHint(true)} 
                  className="bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold px-2.5 py-2 rounded-lg transition border border-amber-200"
                >
                  💡 힌트
                </button>
                <button 
                  onClick={handleStopGame} 
                  className="bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold px-2.5 py-2 rounded-lg transition border border-rose-200"
                >
                  🛑 중단
                </button>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 text-center mb-2">💡 왼쪽의 핸들(☰)을 밀면 이동하고, 글자를 밀면 스크롤됩니다.</p>
            
            {/* 전체 박스에 걸려있던 touch-none을 제거하여 일반 스크롤을 허용함 */}
            <div 
              ref={listRef}
              className="w-full space-y-2 max-h-[52vh] overflow-y-auto bg-slate-100 p-2 rounded-xl border border-slate-200"
            >
              {words.map((word, idx) => (
                <div 
                  key={idx} 
                  data-index={idx}
                  className={`bg-white p-3 rounded-lg flex justify-between items-center shadow-sm border-2 transition-all ${
                    draggedIndex === idx ? 'border-indigo-500 bg-indigo-50 scale-102 shadow-md' : 'border-slate-200'
                  }`}
                >
                  <div className="flex items-center space-x-3 w-full">
                    {/* ★ 오직 이 ☰ 핸들 버튼 영역을 터치했을 때만 즉시 드래그가 작동하도록 바인딩 */}
                    <span 
                      draggable
                      onDragStart={() => handleDragStart(idx)}
                      onDragOver={(e) => handleDragOver(e, idx)}
                      onDragEnd={handleDragEnd}
                      onTouchStart={() => handleTouchStart(idx)}
                      onTouchMove={handleTouchMove}
                      onTouchEnd={handleTouchEnd}
                      className="text-slate-400 text-base font-mono p-1 px-2 bg-slate-50 rounded border border-slate-200 cursor-grab active:cursor-grabbing touch-none select-none"
                    >
                      ☰
                    </span>
                    <span className="text-slate-800 font-medium text-sm select-none">{word}</span>
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
          <div className="w-full">
            <h2 className="text-lg font-bold text-slate-800 mb-3">🏆 실시간 명예의 전당 (Top 10)</h2>
            <div className="w-full space-y-1.5 mb-6 max-h-[40vh] overflow-y-auto">
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
              <p className="mb-2">"이스라엘아 들으라 우리 하나님 여호와는 오직 유일한 여호와이시니"</p>
              <p>"너는 마음을 다하고 뜻을 다하고 힘을 다하여 네 하나님 여호와를 사랑하라"</p>
              <strong>(신명기 6:4-5)</strong><br />
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