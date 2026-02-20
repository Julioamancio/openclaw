'use client'

import { Brain, FileText, CheckSquare, Home } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function Sidebar() {
  const pathname = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard', icon: Home },
    { href: '/memories', label: 'Memorias', icon: Brain },
    { href: '/documents', label: 'Documentos', icon: FileText },
    { href: '/tasks', label: 'Tarefas', icon: CheckSquare },
  ]

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <Brain size={24} color="#3b82f6" />
        <h1>
          Second <span>Brain</span>
        </h1>
      </div>
      <nav>
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
          >
            <item.icon size={20} />
            {item.label}
          </Link>
        ))}
      </nav>
    </aside>
  )
}
