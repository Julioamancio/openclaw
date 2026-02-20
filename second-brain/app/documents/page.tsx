import { FileText, FileCode, File, Plus, Search } from 'lucide-react'
import { documents } from '@/lib/data'

const iconMap = {
  markdown: FileText,
  code: FileCode,
  text: File,
}

export default function DocumentsPage() {
  return (
    <div>
      <div className="page-header">
        <h1>Documentos</h1>
        <p>Arquivos e referências importantes</p>
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
            placeholder="Buscar documentos..."
            className="search-bar"
            style={{ paddingLeft: '2.5rem' }}
          />
        </div>
        <button className="action-btn">
          <Plus size={16} />
          Novo Documento
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <FileText size={20} />
          <h2>Todos os Documentos</h2>
          <span className="badge">{documents.length}</span>
        </div>
        {documents.map((doc) => {
          const Icon = iconMap[doc.type]
          return (
            <div key={doc.id} className="doc-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <Icon size={20} style={{ color: 'var(--accent)' }} />
                <div style={{ flex: 1 }}>
                  <div className="item-title">{doc.title}</div>
                  <div className="item-meta">
                    <span style={{ textTransform: 'uppercase' }}>{doc.type}</span>
                    <span>{doc.size}</span>
                    <span>Atualizado: {doc.updatedAt}</span>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
