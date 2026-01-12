import { useState, useEffect } from 'react'

interface Agent {
    id: string
    status: string
    provider: string
}

export default function AgentPool() {
    const [agents, setAgents] = useState<Agent[]>([])

    useEffect(() => {
        fetch('http://localhost:5555/agents')
            .then(res => res.json())
            .then(data => setAgents(data.agents || []))
            .catch(err => console.error('Failed to fetch agents:', err))
    }, [])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'connected': return '✓'
            case 'busy': return '🔄'
            case 'disconnected': return '⚠'
            default: return '○'
        }
    }

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'connected': return 'text-green-400'
            case 'busy': return 'text-yellow-400'
            case 'disconnected': return 'text-red-400'
            default: return 'text-gray-400'
        }
    }

    return (
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 backdrop-blur-sm">
            <h2 className="text-2xl font-bold text-white mb-4">Agent Pool</h2>

            <div className="space-y-3">
                {agents.length === 0 ? (
                    <p className="text-gray-400 text-center py-8">No agents connected</p>
                ) : (
                    agents.map(agent => (
                        <div key={agent.id} className="bg-gray-700/50 border border-gray-600 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-2">
                                <p className="text-white font-medium capitalize">{agent.id}</p>
                                <span className={`text-lg ${getStatusColor(agent.status)}`}>
                                    {getStatusIcon(agent.status)}
                                </span>
                            </div>
                            <p className="text-gray-400 text-sm">{agent.provider}</p>
                            <div className="mt-3 h-1 bg-gray-600 rounded-full overflow-hidden">
                                <div className="h-full bg-primary w-0"></div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
