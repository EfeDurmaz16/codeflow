import { useState, useEffect } from 'react'

interface TimelineEntry {
    id: string
    timestamp: string
    type: string
    title: string
    summary?: string
}

export default function Timeline() {
    const [entries, setEntries] = useState<TimelineEntry[]>([])

    useEffect(() => {
        fetch('http://localhost:5555/timeline')
            .then(res => res.json())
            .then(data => {
                // Sort by timestamp descending
                const sorted = (data.entries || []).sort((a: TimelineEntry, b: TimelineEntry) =>
                    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
                )
                setEntries(sorted)
            })
            .catch(err => console.error('Failed to fetch timeline:', err))
    }, [])

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 backdrop-blur-sm mt-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
                <span>📅</span> Project Journal
            </h2>

            <div className="relative border-l-2 border-gray-700 ml-3 space-y-6">
                {entries.length === 0 ? (
                    <p className="text-gray-500 text-sm ml-6">No history recorded yet.</p>
                ) : (
                    entries.map((entry) => (
                        <div key={entry.id} className="relative ml-6">
                            {/* Dot */}
                            <span className={`absolute -left-[31px] top-1 h-4 w-4 rounded-full border-2 border-gray-900 ${entry.type === 'task_completed' ? 'bg-green-500' : 'bg-blue-500'
                                }`}></span>

                            {/* Content */}
                            <div className="flex flex-col">
                                <span className="text-xs text-gray-400 font-mono mb-1">
                                    {new Date(entry.timestamp).toLocaleString(undefined, {
                                        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                                    })}
                                </span>
                                <h3 className="text-white font-medium text-sm">{entry.title}</h3>
                                {entry.summary && (
                                    <p className="text-gray-400 text-xs mt-1 border-l-2 border-gray-700 pl-2 line-clamp-3 hover:line-clamp-none">
                                        {entry.summary}
                                    </p>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
