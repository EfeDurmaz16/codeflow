import { useState, useEffect, useRef } from 'react'

interface LogEntry {
    time: string
    type: string
    message: string
}

export default function ActivityLog() {
    const [logs, setLogs] = useState<LogEntry[]>([
        { time: new Date().toLocaleTimeString(), type: 'info', message: 'CodeFlow Dashboard initialized' },
    ])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }

    useEffect(() => {
        scrollToBottom()
    }, [logs])

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:5555/ws')

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            // Handle both specific events and generic logs
            let logMsg = ""
            let logType = "info"

            if (message.type === 'log_entry') {
                logMsg = message.data.message
                logType = message.data.level // info, error, etc
            } else if (message.type === 'task_update') {
                logMsg = `Task ${message.data.task_id} status: ${message.data.status}`
                logType = 'task_update'
            } else {
                return // Ignore other messages for now to keep log clean? Or show all?
            }

            if (logMsg) {
                const newLog: LogEntry = {
                    time: new Date().toLocaleTimeString(),
                    type: logType,
                    message: logMsg,
                }
                setLogs(prev => [newLog, ...prev].slice(0, 50))
            }
        }

        return () => ws.close()
    }, [])

    return (
        <div className="bg-gray-900 border border-gray-700 rounded-lg p-4 font-mono text-xs h-[300px] flex flex-col shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-green-500 to-transparent opacity-50"></div>
            <h2 className="text-green-500 font-bold mb-2 flex items-center gap-2 uppercase tracking-wider text-[10px]">
                <span className="animate-pulse">●</span> System Activity Feed
            </h2>
            <div className="flex-1 overflow-y-auto space-y-1 scrollbar-hide">
                {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-600 italic">
                        Waiting for signals...
                    </div>
                ) : (
                    logs.map((log, i) => (
                        <div key={i} className="text-gray-300 animate-in fade-in slide-in-from-left-1 duration-300 border-l-2 border-transparent hover:border-green-500 pl-2 transition-all">
                            <span className="text-gray-500 mr-2">[{log.time}]</span>
                            <span className={`${log.type === 'error' ? 'text-red-400' :
                                log.type === 'success' ? 'text-green-400' :
                                    log.type === 'task_update' ? 'text-blue-400' :
                                        'text-gray-300'
                                }`}>
                                {log.message}
                            </span>
                        </div>
                    ))
                )}
                <div ref={messagesEndRef} />
            </div>
        </div>
    )
}
