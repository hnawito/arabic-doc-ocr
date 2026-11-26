import { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import { LoginScreen } from './components/LoginScreen'
import { isSignedIn, setSignedIn } from './lib/auth'
import './styles.css'

function Root() {
  const [signedIn, setSignedInState] = useState(isSignedIn)

  if (!signedIn) {
    return (
      <LoginScreen
        onSuccess={() => {
          setSignedIn(true)
          setSignedInState(true)
        }}
      />
    )
  }

  return (
    <App
      onSignOut={() => {
        setSignedIn(false)
        setSignedInState(false)
      }}
    />
  )
}

const container = document.getElementById('root')
if (!container) throw new Error('Root element is missing')

createRoot(container).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
