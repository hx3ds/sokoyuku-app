import { mount } from 'svelte'
import './app.css'
import App from './App.svelte'
import { signIn } from './proxy/auth.js'

if (import.meta.env.DEV) {
  const devUsername = import.meta.env.VITE_DEV_USERNAME
  const devPassword = import.meta.env.VITE_DEV_PASSWORD
  if (devUsername && devPassword) {
    const res = await signIn(devUsername, devPassword)
    if (res?.result !== 0) {
      console.warn('Dev login failed:', res?.msg)
    }
  }
}

const app = mount(App, {
  target: document.getElementById('app'),
})

export default app
