import { useState, useEffect } from 'react'

interface LogEntry {
    time: string
    type: string
    message: string
}

export default function ActivityLog() {
    const [logs, setLogs] = useState<LogEntry[]>([
        { time: new Date().toLocaleTimeString(), type: 'info', message: 'CodeFlow Dashboard initialized' },
    ])

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:5555/ws')

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            const newLog: LogEntry = {
                time: new Date().toLocaleTimeString(),
                type: message.type,
                message: JSON.stringify(message.data),
            }
            setLogs(prev => [newLog, ...prev].slice(0, 20)) // Keep last 20 logs
        }

        return () => ws.close()
    }, [])

    const getTypeColor = (type: string) => {
        if (type.includes('error') || type.includes('failed')) return 'text-red-400'
        if (type.includes('success') || type.includes('completed')) return 'text-green-400'
        if (type.includes('warning')) return 'text-yellow-400'
        return 'text-blue-400'
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">Activity Log</h2>

            <div className="space-y-2 max-h-96 overflow-y-auto">
                {logs.map((log, idx) => (
                    <div key={idx} className="flex gap-3 text-sm">
                        <span className="text-gray-500 shrink-0">{log.time}</span>
                        <span className={`shrink-0 ${getTypeColor(log.type)}`}>
                            {log.type}
                        </span>
                        <span className="text-gray-300 truncate">{log.message}</span>
                    </div>
                ))}
            </div>
        </div>
    )
}
