import { Brain, FileText, CheckSquare, Clock } from 'lucide-react'
import { memories, documents, tasks } from '@/lib/data'

export default function Dashboard() {
  const recentMemories = memories.slice(0, 3)
  const recentDocs = documents.slice(0, 3)
  const pendingTasks = tasks.filter(t => !t.completed).slice(0, 3)

  const taskCounts = {
    total: tasks.length,
    completed: tasks.filter(t => t.completed).length,
    pending: tasks.filter(t => !t.completed).length,
  }

  return (
    <div>
      <div className="page-header">
        <h1>Dashboard</h1>
        <p>Visão geral do Second Brain — Mike & Julio</p>
      </div>

      <div className="dashboard-grid">
        {/* Memorias Recentes */}
        <div className="card">
          <div className="card-header">
            <Brain size={20} />
            <h2>Memórias Recentes</h2>
            <span className="badge">{memories.length}</span>
          </div>
          {recentMemories.map((memory) => (
            <div key={memory.id} className="memory-item">
              <div className="item-title">{memory.title}</div>
              <div className="item-meta">
                <span>{memory.createdAt}</span>
                <span>{memory.tags.join(', ')}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Documentos */}
        <div className="card">
          <div className="card-header">
            <FileText size={20} />
            <h2>Documentos</h2>
            <span className="badge">{documents.length}</span>
          </div>
          {recentDocs.map((doc) => (
            <div key={doc.id} className="doc-item">
              <div className="item-title">{doc.title}</div>
              <div className="item-meta">
                <span>{doc.type}</span>
                <span>{doc.size}</span>
                <span>Atualizado: {doc.updatedAt}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Tarefas Pendentes */}
        <div className="card">
          <div className="card-header">
            <CheckSquare size={20} />
            <h2>Tarefas Pendentes</h2>
            <span className="badge">{taskCounts.pending} restantes</span>
          </div>
          {pendingTasks.map((task) => (
            <div key={task.id} className="task-item">
              <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                <input type="checkbox" className="task-checkbox" disabled />
                <div style={{ flex: 1 }}>
                  <div className="item-title">{task.title}</div>
                  <div className="item-meta">
                    {task.dueDate && (
                      <span><Clock size={12} /> {task.dueDate}</span>
                    )}
                    <span>Prioridade: {task.priority}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Resumo */}
        <div className="card">
          <div className="card-header">
            <CheckSquare size={20} />
            <h2>Resumo de Tarefas</h2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', textAlign: 'center' }}>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--accent)' }}>{taskCounts.total}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Total</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--success)' }}>{taskCounts.completed}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Concluídas</div>
            </div>
            <div>
              <div style={{ fontSize: '2rem', fontWeight: '600', color: 'var(--warning)' }}>{taskCounts.pending}</div>
              <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>Pendentes</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
