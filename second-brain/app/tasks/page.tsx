import { CheckSquare, Plus, Search, Calendar, AlertCircle } from 'lucide-react'
import { tasks } from '@/lib/data'

const priorityColors = {
  low: 'var(--text-muted)',
  medium: 'var(--warning)',
  high: 'var(--danger)',
}

const priorityLabels = {
  low: 'Baixa',
  medium: 'Média',
  high: 'Alta',
}

export default function TasksPage() {
  const pendingTasks = tasks.filter((t) => !t.completed)
  const completedTasks = tasks.filter((t) => t.completed)

  return (
    <div>
      <div className="page-header">
        <h1>Tarefas</h1>
        <p>O que precisamos fazer</p>
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
            placeholder="Buscar tarefas..."
            className="search-bar"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <button className="action-btn">
          <Plus size={16} />
          Nova Tarefa
        </button>
      </div>

      <div className="dashboard-grid">
        {/* Pendentes */}
        <div className="card">
          <div className="card-header">
            <AlertCircle size={20} />
            <h2>Pendentes</h2>
            <span className="badge">{pendingTasks.length}</span>
          </div>
          {pendingTasks.length === 0 ? (
            <div className="empty-state">
              <CheckSquare size={48} />
              <p>Todas as tarefas concluídas!</p>
            </div>
          ) : (
            pendingTasks.map((task) => (
              <div key={task.id} className="task-item">
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <input type="checkbox" className="task-checkbox" />
                  <div style={{ flex: 1 }}>
                    <div className="item-title">{task.title}</div>
                    <div className="item-meta">
                      {task.dueDate && (
                        <span>
                          <Calendar size={12} style={{ display: 'inline', marginRight: '0.25rem' }} />
                          {task.dueDate}
                        </span>
                      )}
                      <span style={{ color: priorityColors[task.priority] }}>
                        Prioridade: {priorityLabels[task.priority]}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Concluídas */}
        <div className="card">
          <div className="card-header">
            <CheckSquare size={20} />
            <h2>Concluídas</h2>
            <span className="badge">{completedTasks.length}</span>
          </div>
          {completedTasks.length === 0 ? (
            <div className="empty-state">
              <CheckSquare size={48} />
              <p>Nenhuma tarefa concluída ainda.</p>
            </div>
          ) : (
            completedTasks.map((task) => (
              <div key={task.id} className="task-item task-completed">
                <div style={{ display: 'flex', alignItems: 'flex-start' }}>
                  <input
                    type="checkbox"
                    className="task-checkbox"
                    checked
                    readOnly
                  />
                  <div style={{ flex: 1 }}>
                    <div className="item-title">{task.title}</div>
                    <div className="item-meta">
                      <span>Concluída</span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
