import { Brain, Search } from 'lucide-react'
import { memories } from '@/lib/data'

export default function MemoriesPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Memórias</h1>
        <p>Tudo que precisamos lembrar</p>
      </div>

      <div className="section-header">
        <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
          <Search
            size={18}
            style={{
              position: 'absolute',
              left: '0.75rem',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--text-muted)',
            }}
          />
          <input
            type="text"
            placeholder="Buscar memórias..."
            className="search-bar"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <button className="action-btn">
          <Brain size={16} />
          Nova Memória
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <Brain size={20} />
          <h2>Todas as Memórias</h2>
          <span className="badge">{memories.length}</span>
        </div>
        {memories.map((memory) => (
          <div key={memory.id} className="memory-item">
            <div className="item-title">{memory.title}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
              {memory.content}
            </div>
            <div className="item-meta">
              <span>{memory.createdAt}</span>
              {memory.tags.map((tag) => (
                <span key={tag} style={{ color: 'var(--accent)' }}>
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
