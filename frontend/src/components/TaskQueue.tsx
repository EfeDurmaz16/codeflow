import { useState, useEffect } from 'react'

interface Task {
    id: string
    name: string
    status: string
    assignment_reason?: string
    completion_summary?: string
}

export default function TaskQueue() {
    const [tasks, setTasks] = useState<Task[]>([])

    useEffect(() => {
        fetch('http://localhost:5555/tasks')
            .then(res => res.json())
            .then(data => setTasks(data.tasks || []))
            .catch(err => console.error('Failed to fetch tasks:', err))
    }, [])

    const handleReview = (taskId: string, action: 'approve' | 'reject') => {
        fetch(`http://localhost:5555/tasks/review/${taskId}/${action}`, { method: 'POST' })
            .then(res => {
                if (res.ok) {
                    // Optimistic update or wait for re-fetch
                    // For now, simple re-fetch happens automatically via poll or we can trigger it
                    // Actually we don't have polling enabled in shared snippet, assuming websocket updates.
                    // But review backend logic should trigger task_update event which updates list?
                    // Fetch list again to be sure
                    fetch('http://localhost:5555/tasks').then(res => res.json()).then(d => setTasks(d.tasks || []))
                }
            })
    }

    // ... inside map ...
    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-blue-500'
            case 'running': return 'bg-yellow-500'
            case 'completed': return 'bg-green-500'
            case 'failed': return 'bg-red-500'
            case 'review': return 'bg-orange-500'
            default: return 'bg-gray-500'
        }
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">Task Queue</h2>

            <div className="space-y-3">
                {tasks.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No tasks in queue</p>
                ) : (
                    tasks.map(task => (
                        <div key={task.id} className={`bg-gray-700/50 border rounded-lg p-4 transition-all ${task.status === 'review' ? 'border-orange-500/50 shadow-[0_0_15px_rgba(249,115,22,0.1)]' : 'border-gray-600 hover:border-primary'
                            }`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className={`h-2 w-2 rounded-full ${getStatusColor(task.status)} ${task.status === 'running' ? 'animate-pulse' : ''}`}></div>
                                    <div>
                                        <p className="text-white font-medium">{task.name}</p>
                                        <p className="text-gray-400 text-sm">{task.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs px-2 py-1 rounded bg-gray-600 text-gray-300">
                                        {task.status}
                                    </span>
                                    {task.status === 'review' && (
                                        <div className="flex gap-1 ml-2">
                                            <button
                                                onClick={() => handleReview(task.id, 'approve')}
                                                className="bg-green-600 hover:bg-green-500 text-white text-xs px-2 py-1 rounded transition"
                                            >
                                                ✓ Approve
                                            </button>
                                            <button
                                                onClick={() => handleReview(task.id, 'reject')}
                                                className="bg-red-600 hover:bg-red-500 text-white text-xs px-2 py-1 rounded transition"
                                            >
                                                ✕ Reject
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                            {task.assignment_reason && (
                                <div className="mt-2 text-xs text-gray-400 border-t border-gray-600 pt-2 flex items-center gap-1">
                                    <span className="text-blue-400">🤖 Routing:</span>
                                    {task.assignment_reason}
                                </div>
                            )}
                            {task.status === 'completed' && task.completion_summary && (
                                <div className="mt-2 text-xs text-gray-300 bg-gray-800 rounded p-2 border border-green-900/30">
                                    <div className="flex items-center gap-1 mb-1 text-green-400 font-semibold">
                                        <span>✓ Completion Summary:</span>
                                    </div>
                                    <p className="whitespace-pre-wrap font-mono text-[10px] opacity-80 leading-relaxed">
                                        {task.completion_summary}
                                    </p>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div >
    )
}
