import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { DesignProvider } from './lib/design'
import { CourseDetail } from './pages/CourseDetail'
import { Courses } from './pages/Courses'
import { Home } from './pages/Home'
import { Lesson } from './pages/Lesson'
import { Conectar } from './pages/Conectar'
import { Login } from './pages/Login'
import { Prompts } from './pages/Prompts'
import { References } from './pages/References'
import { Skills } from './pages/Skills'
import { Baixador } from './pages/Baixador'
import { Drive } from './pages/Drive'
import { BaixarMusica } from './pages/trilhas/BaixarMusica'
import { Biblioteca } from './pages/trilhas/Biblioteca'
import { MelhorarVoz } from './pages/trilhas/MelhorarVoz'
import { RemoverVoz } from './pages/trilhas/RemoverVoz'
import './index.css'

function App() {
  return (
    <DesignProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/conectar" element={<Conectar />} />
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/prompts" element={<Prompts />} />
          <Route path="/skills" element={<Skills />} />
          <Route path="/referencias/:tab" element={<References />} />
          <Route path="/cursos" element={<Courses />} />
          <Route path="/cursos/:courseId" element={<CourseDetail />} />
          <Route path="/cursos/:courseId/aula/:itemId" element={<Lesson />} />
          <Route path="/trilhas" element={<Biblioteca />} />
          <Route path="/trilhas/baixar" element={<BaixarMusica />} />
          <Route path="/trilhas/separar" element={<RemoverVoz />} />
          <Route path="/trilhas/melhorar" element={<MelhorarVoz />} />
          <Route path="/baixador" element={<Baixador />} />
          <Route path="/baixador/drive" element={<Drive />} />
        </Route>
      </Routes>
    </BrowserRouter>
    </DesignProvider>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
