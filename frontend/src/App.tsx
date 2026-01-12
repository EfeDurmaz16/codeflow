import { useState, useEffect } from 'react'
import './App.css'
import TaskQueue from './components/TaskQueue'
import AgentPool from './components/AgentPool'
import ActivityLog from './components/ActivityLog'
import StatsCard from './components/StatsCard'

interface DashboardStats {
    active_tasks: number
    completed_tasks: number
    total_tasks: number
    connected_agents: number
    total_agents: number
}

function App() {
    const [stats, setStats] = useState<DashboardStats | null>(null)
    const [isConnected, setIsConnected] = useState(false)

    useEffect(() => {
        // Fetch initial stats
        fetch('http://localhost:5555/stats')
            .then(res => res.json())
            .then(data => setStats(data))
            .catch(err => console.error('Failed to fetch stats:', err))

        // Connect to WebSocket
        const ws = new WebSocket('ws://localhost:5555/ws')

        ws.onopen = () => {
            console.log('WebSocket connected')
            setIsConnected(true)
        }

        ws.onclose = () => {
            console.log('WebSocket disconnected')
            setIsConnected(false)
        }

        ws.onmessage = (event) => {
            const message = JSON.parse(event.data)
            console.log('WebSocket message:', message)

            if (message.type === 'stats_update') {
                setStats(message.data)
            }
        }

        return () => ws.close()
    }, [])

    return (
        <div className="min-h-screen bg-gradient-to-br from-gray-900 via-slate-900 to-gray-900">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-4xl font-bold text-white mb-2">
                            CodeFlow Dashboard
                        </h1>
                        <p className="text-gray-400">
                            The task queue for AI agents
                        </p>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className={`h-3 w-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`}></div>
                        <span className="text-gray-300 text-sm">
                            {isConnected ? 'Live' : 'Offline'}
                        </span>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                    <StatsCard title="Active Tasks" value={stats?.active_tasks ?? 0} color="blue" />
                    <StatsCard title="Completed" value={stats?.completed_tasks ?? 0} color="green" />
                    <StatsCard title="Connected Agents" value={stats?.connected_agents ?? 0} color="purple" />
                    <StatsCard title="Total Tasks" value={stats?.total_tasks ?? 0} color="gray" />
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="lg:col-span-2 space-y-6">
                        <TaskQueue />
                        <ActivityLog />
                    </div>
                    <div>
                        <AgentPool />
                    </div>
                </div>
            </div>
        </div>

    )
}

export default App
