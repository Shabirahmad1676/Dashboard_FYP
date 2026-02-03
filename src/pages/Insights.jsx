
import { useEffect, useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Eye, MousePointer2, TrendingUp } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Insights() {
    const [loading, setLoading] = useState(true)
    const [stats, setStats] = useState({ views: 0, clicks: 0, ctr: 0 })
    const [dailyData, setDailyData] = useState([])
    const [engagementData, setEngagementData] = useState([])

    useEffect(() => {
        fetchAnalytics()
    }, [])

    const fetchAnalytics = async () => {
        try {
            setLoading(true)

            // Fetch all analytics events
            const { data, error } = await supabase
                .from('billboard_analytics')
                .select('event_type, created_at')
                .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

            if (error) throw error

            if (data) {
                // Calculate Totals
                const views = data.filter(e => e.event_type === 'view').length
                const clicks = data.filter(e => e.event_type === 'click').length
                const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : 0

                setStats({ views, clicks, ctr })

                setEngagementData([
                    { name: 'Views', value: views },
                    { name: 'Clicks', value: clicks },
                ])

                // Calculate Daily Trends
                const last7Days = [...Array(7)].map((_, i) => {
                    const d = new Date()
                    d.setDate(d.getDate() - (6 - i))
                    return { date: d.toISOString().split('T')[0], name: d.toLocaleDateString('en-US', { weekday: 'short' }), views: 0, clicks: 0 }
                })

                data.forEach(e => {
                    const date = e.created_at.split('T')[0]
                    const dayStat = last7Days.find(d => d.date === date)
                    if (dayStat) {
                        if (e.event_type === 'view') dayStat.views++
                        if (e.event_type === 'click') dayStat.clicks++
                    }
                })

                setDailyData(last7Days)
            }

        } catch (err) {
            console.error('Error fetching analytics:', err)
        } finally {
            setLoading(false)
        }
    }

    const COLORS = ['#8b5cf6', '#10b981'];

    return (
        <div className="container">
            <header style={{ marginBottom: '2rem' }}>
                <h1>Insights</h1>
                <p className="text-muted">Billboard Performance & Engagement</p>
            </header>

            {/* Stats Row */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <div className="card flex-center" style={{ justifyContent: 'space-between' }}>
                    <div>
                        <p className="text-muted text-sm">Total Views (30d)</p>
                        <h2>{stats.views}</h2>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-body)', borderRadius: '50%' }}>
                        <Eye size={24} color="var(--primary)" />
                    </div>
                </div>
                <div className="card flex-center" style={{ justifyContent: 'space-between' }}>
                    <div>
                        <p className="text-muted text-sm">Total Clicks (30d)</p>
                        <h2>{stats.clicks}</h2>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-body)', borderRadius: '50%' }}>
                        <MousePointer2 size={24} color="var(--success)" />
                    </div>
                </div>
                <div className="card flex-center" style={{ justifyContent: 'space-between' }}>
                    <div>
                        <p className="text-muted text-sm">Click-Through Rate</p>
                        <h2>{stats.ctr}%</h2>
                    </div>
                    <div style={{ padding: '0.75rem', background: 'var(--bg-body)', borderRadius: '50%' }}>
                        <TrendingUp size={24} color="var(--warning)" />
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                {/* Area Chart - Daily Activity */}
                <div className="card" style={{ height: '400px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Daily Activity (Last 7 Days)</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailyData}>
                            <defs>
                                <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="colorClicks" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" axisLine={false} tickLine={false} />
                            <YAxis axisLine={false} tickLine={false} />
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid var(--border)' }} />
                            <Area type="monotone" dataKey="views" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorViews)" />
                            <Area type="monotone" dataKey="clicks" stroke="#10b981" fillOpacity={1} fill="url(#colorClicks)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Pie Chart - Engagement */}
                <div className="card" style={{ height: '400px' }}>
                    <h3 style={{ marginBottom: '1.5rem' }}>Engagement Split</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={engagementData}
                                cx="50%"
                                cy="50%"
                                innerRadius={60}
                                outerRadius={80}
                                paddingAngle={5}
                                dataKey="value"
                            >
                                {engagementData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip />
                            <Legend verticalAlign="bottom" height={36} />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
