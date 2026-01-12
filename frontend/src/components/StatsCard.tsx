interface StatsCardProps {
    title: string
    value: number
    color: 'blue' | 'green' | 'purple' | 'gray'
}

const colorClasses = {
    blue: 'from-blue-500/20 to-blue-600/20 border-blue-500/50',
    green: 'from-green-500/20 to-green-600/20 border-green-500/50',
    purple: 'from-purple-500/20 to-purple-600/20 border-purple-500/50',
    gray: 'from-gray-500/20 to-gray-600/20 border-gray-500/50',
}

const textColorClasses = {
    blue: 'text-blue-400',
    green: 'text-green-400',
    purple: 'text-purple-400',
    gray: 'text-gray-400',
}

export default function StatsCard({ title, value, color }: StatsCardProps) {
    return (
        <div className={`bg-gradient-to-br ${colorClasses[color]} border rounded-lg p-6 backdrop-blur-sm`}>
            <p className="text-gray-400 text-sm mb-1">{title}</p>
            <p className={`text-3xl font-bold ${textColorClasses[color]}`}>{value}</p>
        </div>
    )
}
