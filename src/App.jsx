import { useEffect, useMemo, useRef, useState } from 'react'
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Home,
  ListChecks,
  Play,
  Star,
  UserRound,
} from 'lucide-react'
import './App.css'

const PLAYLIST_ID = 'PLVcVykBcFZTQ5V8i6mJtos47LfGDIasDg'
const TOTAL_DAYS = 172
const STORAGE_KEY = 'bible-reading-companion-v2'

const tabs = [
  { id: 'today', label: '이어가기', icon: Home },
  { id: 'plan', label: '회차표', icon: ListChecks },
  { id: 'record', label: '내 기록', icon: UserRound },
]

const readingSections = [
  { id: 'openingPsalm', label: '시편 1', placeholder: '예: 시편 1편' },
  { id: 'oldTestament', label: '구약', placeholder: '예: 창세기 1-3장' },
  { id: 'newTestament', label: '신약', placeholder: '예: 마태복음 1장' },
  { id: 'closingPsalm', label: '시편 2', placeholder: '예: 시편 2편' },
]

const defaultState = {
  selectedDay: null,
  completedDays: [],
  ranges: {},
  notes: {},
  favorites: [],
}

function loadState() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    return saved ? { ...defaultState, ...JSON.parse(saved) } : defaultState
  } catch {
    return defaultState
  }
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
}

function clampDay(day) {
  return Math.min(TOTAL_DAYS, Math.max(1, day))
}

function normalizeRange(rawRange) {
  if (!rawRange) {
    return {}
  }

  if (typeof rawRange === 'string') {
    return { oldTestament: rawRange }
  }

  return rawRange
}

function summarizeRange(rawRange) {
  const range = normalizeRange(rawRange)
  const parts = readingSections
    .map((section) => range[section.id])
    .filter((value) => value && value.trim())

  return parts.length ? parts.join(' / ') : ''
}

function loadYouTubeApi() {
  if (window.YT?.Player) {
    return Promise.resolve(window.YT)
  }

  if (window.youTubeApiPromise) {
    return window.youTubeApiPromise
  }

  window.youTubeApiPromise = new Promise((resolve) => {
    const previousReady = window.onYouTubeIframeAPIReady

    window.onYouTubeIframeAPIReady = () => {
      if (previousReady) {
        previousReady()
      }
      resolve(window.YT)
    }

    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    script.async = true
    document.body.appendChild(script)
  })

  return window.youTubeApiPromise
}

function PlaylistPlayer({ day }) {
  const playerNodeRef = useRef(null)
  const playerRef = useRef(null)
  const playerReadyRef = useRef(false)
  const latestDayRef = useRef(day)

  useEffect(() => {
    latestDayRef.current = day
  }, [day])

  useEffect(() => {
    let cancelled = false

    loadYouTubeApi().then((YT) => {
      if (cancelled || !playerNodeRef.current || playerRef.current) {
        return
      }

      playerRef.current = new YT.Player(playerNodeRef.current, {
        width: '100%',
        height: '100%',
        playerVars: {
          listType: 'playlist',
          list: PLAYLIST_ID,
          rel: 0,
        },
        events: {
          onReady: (event) => {
            playerReadyRef.current = true
            event.target.cuePlaylist({
              listType: 'playlist',
              list: PLAYLIST_ID,
              index: latestDayRef.current - 1,
            })
          },
        },
      })
    })

    return () => {
      cancelled = true
      playerRef.current?.destroy?.()
      playerRef.current = null
      playerReadyRef.current = false
    }
  }, [])

  useEffect(() => {
    if (!playerReadyRef.current || !playerRef.current) {
      return
    }

    playerRef.current.cuePlaylist({
      listType: 'playlist',
      list: PLAYLIST_ID,
      index: day - 1,
    })
  }, [day])

  return (
    <div className="youtube-player" aria-label={`Day ${day} 공동체 성경읽기 영상`}>
      <div ref={playerNodeRef} />
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState('today')
  const [state, setState] = useState(loadState)

  const completedSet = useMemo(() => new Set(state.completedDays), [state.completedDays])
  const favoriteSet = useMemo(() => new Set(state.favorites), [state.favorites])
  const completedCount = state.completedDays.length
  const progress = Math.round((completedCount / TOTAL_DAYS) * 100)
  const nextOpenDay = clampDay(
    Array.from({ length: TOTAL_DAYS }, (_, index) => index + 1).find(
      (day) => !completedSet.has(day),
    ) || TOTAL_DAYS,
  )
  const selectedDay = clampDay(state.selectedDay || nextOpenDay)
  const selectedIsSuggested = selectedDay === nextOpenDay

  const updateState = (patch) => {
    setState((current) => {
      const next = typeof patch === 'function' ? patch(current) : { ...current, ...patch }
      saveState(next)
      return next
    })
  }

  const setSelectedDay = (day) => {
    updateState((current) => ({ ...current, selectedDay: clampDay(day) }))
  }

  const toggleComplete = (day) => {
    updateState((current) => {
      const exists = current.completedDays.includes(day)
      const completedDays = exists
        ? current.completedDays.filter((item) => item !== day)
        : [...current.completedDays, day].sort((a, b) => a - b)
      return { ...current, completedDays }
    })
  }

  const toggleFavorite = (day) => {
    updateState((current) => {
      const exists = current.favorites.includes(day)
      const favorites = exists
        ? current.favorites.filter((item) => item !== day)
        : [...current.favorites, day].sort((a, b) => a - b)
      return { ...current, favorites }
    })
  }

  const updateRange = (day, sectionId, value) => {
    updateState((current) => ({
      ...current,
      ranges: {
        ...current.ranges,
        [day]: {
          ...normalizeRange(current.ranges[day]),
          [sectionId]: value,
        },
      },
    }))
  }

  const updateNote = (day, value) => {
    updateState((current) => ({
      ...current,
      notes: { ...current.notes, [day]: value },
    }))
  }

  const dayTitle = `Day ${selectedDay}`
  const range = normalizeRange(state.ranges[selectedDay])
  const noteText = state.notes[selectedDay] || ''
  const playlistPosition = selectedDay
  const playlistUrl = `https://www.youtube.com/playlist?list=${PLAYLIST_ID}`

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">
            <BookOpen size={23} />
          </div>
          <div>
            <p className="eyebrow">공동체 성경읽기</p>
            <h1>30분 172일 말씀동행</h1>
          </div>
        </div>

        <nav className="tab-list" aria-label="주요 메뉴">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                className={activeTab === tab.id ? 'tab active' : 'tab'}
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                type="button"
                title={tab.label}
              >
                <Icon size={19} />
                <span>{tab.label}</span>
              </button>
            )
          })}
        </nav>

        <div className="side-progress">
          <div className="progress-label">
            <span>{completedCount}회차 완료</span>
            <strong>{progress}%</strong>
          </div>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <button
            className="ghost-button"
            onClick={() => {
              setSelectedDay(nextOpenDay)
              setActiveTab('today')
            }}
            type="button"
          >
            <Play size={16} />
            <span>이어보기</span>
          </button>
        </div>
      </aside>

      <main className="workspace">
        <header className="topbar">
          <div>
            <p className="eyebrow">
              내 페이스 기준 다음 회차는 Day {nextOpenDay}
            </p>
            <h2>
              {activeTab === 'today'
                ? `${selectedIsSuggested ? '이어갈 말씀' : '선택한 회차'} ${dayTitle}`
                : tabs.find((tab) => tab.id === activeTab)?.label}
            </h2>
          </div>
        </header>

        {activeTab === 'today' && (
          <section className="today-layout">
            <div className="video-panel">
              <div className="day-switcher">
                <button
                  className="icon-button"
                  onClick={() => setSelectedDay(selectedDay - 1)}
                  type="button"
                  title="이전 회차"
                >
                  <ChevronLeft size={20} />
                </button>
                <div>
                  <span>{dayTitle}</span>
                  <strong>{selectedIsSuggested ? '여기서 이어가요' : '다시 보는 회차'}</strong>
                </div>
                <button
                  className="icon-button"
                  onClick={() => setSelectedDay(selectedDay + 1)}
                  type="button"
                  title="다음 회차"
                >
                  <ChevronRight size={20} />
                </button>
              </div>

              <PlaylistPlayer day={selectedDay} />

              <div className="video-match">
                <span>Day {selectedDay}</span>
                <strong>재생목록 {playlistPosition}번째 영상</strong>
                <a href={playlistUrl} target="_blank" rel="noreferrer">
                  재생목록 열기
                </a>
              </div>

              <div className="action-row">
                <button
                  className={completedSet.has(selectedDay) ? 'primary-button done' : 'primary-button'}
                  onClick={() => toggleComplete(selectedDay)}
                  type="button"
                >
                  <Check size={18} />
                  <span>{completedSet.has(selectedDay) ? '완료됨' : '완료했어요'}</span>
                </button>
                <button
                  className={favoriteSet.has(selectedDay) ? 'icon-text-button active' : 'icon-text-button'}
                  onClick={() => toggleFavorite(selectedDay)}
                  type="button"
                >
                  <Star size={18} />
                  <span>저장</span>
                </button>
              </div>
            </div>

            <div className="companion-panel">
              <div className="range-panel">
                <div>
                  <p className="eyebrow">영상 순서에 맞춘 범위</p>
                  <h3>시편, 구약, 신약, 시편</h3>
                </div>
                <div className="range-grid">
                  {readingSections.map((section) => (
                    <label className="field-block" key={section.id}>
                      <span>{section.label}</span>
                      <input
                        value={range[section.id] || ''}
                        onChange={(event) =>
                          updateRange(selectedDay, section.id, event.target.value)
                        }
                        placeholder={section.placeholder}
                      />
                    </label>
                  ))}
                </div>
              </div>

              <label className="field-block note-block">
                <span>묵상 메모</span>
                <textarea
                  value={noteText}
                  onChange={(event) => updateNote(selectedDay, event.target.value)}
                  placeholder="오늘 마음에 남은 것을 적어보세요."
                />
              </label>
            </div>
          </section>
        )}

        {activeTab === 'plan' && (
          <section className="plan-view">
            <div className="plan-summary">
              <div>
                <p className="eyebrow">전체 여정</p>
                <strong>{TOTAL_DAYS}회차 말씀 여정</strong>
                <span className="muted-text">날짜와 상관없이 마지막 완료 다음 회차부터 이어갑니다.</span>
              </div>
              <button
                className="secondary-button"
                onClick={() => {
                  setSelectedDay(nextOpenDay)
                  setActiveTab('today')
                }}
                type="button"
              >
                <Play size={17} />
                <span>이어갈 회차</span>
              </button>
            </div>
            <div className="day-grid">
              {Array.from({ length: TOTAL_DAYS }, (_, index) => {
                const day = index + 1
                const isSelected = selectedDay === day
                const isDone = completedSet.has(day)
                const isNext = nextOpenDay === day
                return (
                  <button
                    className={[
                      'day-cell',
                      isDone ? 'done' : '',
                      isNext ? 'next' : '',
                      isSelected ? 'selected' : '',
                    ].join(' ')}
                    key={day}
                    onClick={() => {
                      setSelectedDay(day)
                      setActiveTab('today')
                    }}
                    type="button"
                  >
                    <span>Day {day}</span>
                    <small>
                      {isDone ? '완료' : isNext ? '이어갈 회차' : '미완료'}
                    </small>
                    {summarizeRange(state.ranges[day]) && (
                      <em>{summarizeRange(state.ranges[day])}</em>
                    )}
                  </button>
                )
              })}
            </div>
          </section>
        )}

        {activeTab === 'record' && (
          <section className="record-view">
            <div className="metric-grid">
              <div className="metric-card">
                <span>진행률</span>
                <strong>{progress}%</strong>
              </div>
              <div className="metric-card">
                <span>완료</span>
                <strong>{completedCount}회차</strong>
              </div>
              <div className="metric-card">
                <span>저장</span>
                <strong>{state.favorites.length}개</strong>
              </div>
            </div>

            <div className="record-list">
              {Array.from({ length: TOTAL_DAYS }, (_, index) => index + 1)
                .filter((day) => completedSet.has(day) || state.notes[day] || favoriteSet.has(day))
                .map((day) => (
                  <button
                    className="record-item"
                    key={day}
                    onClick={() => {
                      setSelectedDay(day)
                      setActiveTab('today')
                    }}
                    type="button"
                  >
                    <div>
                      <strong>Day {day}</strong>
                      <span>{summarizeRange(state.ranges[day]) || '읽기 범위 미입력'}</span>
                      {state.notes[day] && <p>{state.notes[day]}</p>}
                    </div>
                    <div className="record-badges">
                      {completedSet.has(day) && <Check size={17} />}
                      {favoriteSet.has(day) && <Star size={17} />}
                    </div>
                  </button>
                ))}
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App
