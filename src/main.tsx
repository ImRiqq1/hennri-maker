import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { CourseDetail } from './pages/CourseDetail'
import { Courses } from './pages/Courses'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Login } from './pages/Login'
import { Prompts } from './pages/Prompts'
import { References } from './pages/References'
import { Skills } from './pages/Skills'
import './index.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/referencias/:tab" element={<References />} />
          <Route path="/cursos" element={<Courses />} />
          <Route path="/cursos/:courseId" element={<CourseDetail />} />
          <Route path="/cursos/:courseId/aula/:itemId" element={<Lesson />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
