import { useEffect, useState } from 'react'

const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:8000'

function App() {
  const [status, setStatus] = useState('checking backend...')

  useEffect(() => {
    fetch(`${API_URL}/health`)
      .then((r) => r.json())
      .then((d) => setStatus(`backend ok: ${JSON.stringify(d)}`))
      .catch((e) => setStatus(`backend unreachable: ${String(e)}`))
  }, [])

  return (
    <main>
      <h1>MeetSpot 饭局 Agent</h1>
      <p>{status}</p>
      <p>API: {API_URL}</p>
    </main>
  )
}

export default App
