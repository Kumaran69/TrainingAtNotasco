import { useEffect, useRef, useState } from 'react'
import { api } from './api.js'

const STORAGE_KEY = 'assistant_session_id'

const QUICK_ACTIONS = [
  { label: 'What can you do?', text: 'help' },
  { label: 'Calculator', text: 'calculate' },
  { label: 'Take the quiz', text: 'quiz' },
  { label: 'Add a task', text: 'add task' },
  { label: 'My stats', text: 'stats' },
]

function NameGate({ onStart }) {
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setLoading(true)
    setError(null)
    try {
      await onStart(name.trim())
    } catch (err) {
      setError(
        err.message.includes('fetch')
          ? "Could not reach the assistant. Is the backend running?"
          : err.message
      )
      setLoading(false)
    }
  }

  return (
    <div className="gate">
      <div className="gate__card">
        <div className="gate__badge">RULE-BASED ASSISTANT</div>
        <h1>What should I call you?</h1>
        <p className="gate__sub">I'll remember your name for the whole session.</p>
        <form onSubmit={handleSubmit}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Your name"
          />
          <button type="submit" disabled={loading || !name.trim()}>
            {loading ? 'Starting…' : 'Start chatting'}
          </button>
        </form>
        {error && <p className="gate__error">{error}</p>}
      </div>
    </div>
  )
}

function Bubble({ sender, text }) {
  const isBot = sender === 'bot'
  return (
    <div className={`bubble-row ${isBot ? 'bubble-row--bot' : 'bubble-row--user'}`}>
      {isBot && <div className="avatar">✦</div>}
      <div className={`bubble ${isBot ? 'bubble--bot' : 'bubble--user'}`}>
        {text.split('\n').map((line, i) => <div key={i}>{line || '\u00A0'}</div>)}
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="stat-card">
      <span className="stat-card__value">{value}</span>
      <span className="stat-card__label">{label}</span>
    </div>
  )
}

export default function App() {
  const [sessionId, setSessionId] = useState(null)
  const [name, setName] = useState('')
  const [messages, setMessages] = useState([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const [tasks, setTasks] = useState([])
  const [stats, setStats] = useState(null)
  const [initializing, setInitializing] = useState(true)
  const bottomRef = useRef(null)

  async function refreshSidebar(sid) {
    try {
      const [t, s] = await Promise.all([api.getTasks(sid), api.getStats(sid)])
      setTasks(t)
      setStats(s)
    } catch {
      /* sidebar is a nice-to-have; don't break the chat if it fails */
    }
  }

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      setInitializing(false)
      return
    }
    ;(async () => {
      try {
        const session = await api.getSession(saved)
        const history = await api.getMessages(saved)
        setSessionId(saved)
        setName(session.name)
        setMessages(history)
        await refreshSidebar(saved)
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      } finally {
        setInitializing(false)
      }
    })()
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function handleStart(enteredName) {
    const res = await api.start(enteredName)
    localStorage.setItem(STORAGE_KEY, res.session_id)
    setSessionId(res.session_id)
    setName(res.name)
    setMessages([{ sender: 'bot', text: res.greeting }])
    await refreshSidebar(res.session_id)
  }

  async function sendMessage(text) {
    const trimmed = text.trim()
    if (!trimmed || sending) return
    setMessages((m) => [...m, { sender: 'user', text: trimmed }])
    setInput('')
    setSending(true)
    try {
      const res = await api.chat(sessionId, trimmed)
      setMessages((m) => [...m, { sender: 'bot', text: res.reply }])
      await refreshSidebar(sessionId)
    } catch (err) {
      setMessages((m) => [...m, { sender: 'bot', text: `Error: ${err.message}` }])
    } finally {
      setSending(false)
    }
  }

  function handleSubmit(e) {
    e.preventDefault()
    sendMessage(input)
  }

  if (initializing) {
    return <div className="gate"><div className="gate__card"><p className="gate__sub">Loading…</p></div></div>
  }

  if (!sessionId) {
    return <NameGate onStart={handleStart} />
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar__header">
          <div className="sidebar__avatar">{name.charAt(0).toUpperCase()}</div>
          <div>
            <div className="sidebar__name">{name}</div>
            <div className="sidebar__tag">Active session</div>
          </div>
        </div>

        {stats && (
          <div className="stat-grid">
            <StatCard label="Messages" value={stats.messages_sent} />
            <StatCard label="Tasks left" value={stats.tasks_remaining} />
            <StatCard
              label="Quiz"
              value={stats.quiz_taken ? `${stats.quiz_score}/${stats.quiz_total}` : '—'}
            />
          </div>
        )}

        <div className="sidebar__section">
          <div className="sidebar__section-title">To-do</div>
          {tasks.length === 0 ? (
            <p className="sidebar__empty">No tasks yet — try "add task".</p>
          ) : (
            <ul className="task-list">
              {tasks.map((t) => <li key={t.id}>{t.text}</li>)}
            </ul>
          )}
        </div>

        <div className="sidebar__section">
          <div className="sidebar__section-title">Quick actions</div>
          <div className="quick-actions">
            {QUICK_ACTIONS.map((qa) => (
              <button key={qa.text} onClick={() => sendMessage(qa.text)} disabled={sending}>
                {qa.label}
              </button>
            ))}
          </div>
        </div>
      </aside>

      <main className="chat">
        <header className="chat__header">
          <div className="chat__title">✦ Rule-Based Assistant</div>
          <div className="chat__subtitle">Keyword-matched answers, calculator, quiz, and a to-do list</div>
        </header>

        <div className="chat__messages">
          {messages.map((m, i) => <Bubble key={i} sender={m.sender} text={m.text} />)}
          {sending && (
            <div className="bubble-row bubble-row--bot">
              <div className="avatar">✦</div>
              <div className="bubble bubble--bot bubble--typing">
                <span></span><span></span><span></span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form className="chat__input" onSubmit={handleSubmit}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message… try 'help'"
            disabled={sending}
          />
          <button type="submit" disabled={sending || !input.trim()}>Send</button>
        </form>
      </main>
    </div>
  )
}
