import { readFileSync } from 'fs'
import { join } from 'path'

export interface Memory {
  id: string
  title: string
  content: string
  createdAt: string
  tags: string[]
}

export interface Document {
  id: string
  title: string
  type: 'markdown' | 'code' | 'text'
  updatedAt: string
  size: string
}

export interface Task {
  id: string
  title: string
  completed: boolean
  dueDate?: string
  priority: 'low' | 'medium' | 'high'
}

// Read data from JSON files in data/
const dataDir = join(process.cwd(), 'data')

function loadJSON<T>(filename: string): T[] {
  try {
    const filePath = join(dataDir, filename)
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content)
  } catch {
    return []
  }
}

export const memories: Memory[] = loadJSON<Memory>('memories.json')
export const documents: Document[] = loadJSON<Document>('documents.json')
export const tasks: Task[] = loadJSON<Task>('tasks.json')
