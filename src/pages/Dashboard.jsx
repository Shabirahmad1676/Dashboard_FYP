
import { useEffect, useState } from 'react'
import { LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Eye, TrendingUp, Activity, Bookmark, Zap, Info, Wallet } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Dashboard() {
    const [loading, setLoading] = useState(true)
    const [metrics, setMetrics] = useState({
        totalViews: 0,
        totalClaims: 0,
        totalRedemptions: 0,
        conversionRate: 0,
        activeCampaigns: 0
    })
    const [engagementData, setEngagementData] = useState([])
    const [interestData, setInterestData] = useState([])
    const [insightText, setInsightText] = useState('')

    useEffect(() => {
        fetchDashboardData()
    }, [])

    const fetchDashboardData = async () => {
        try {
            setLoading(true)

            // 1. Fetch Billboards
            const { data: billboards } = await supabase
                .from('billboards')
                .select('id, views, is_active, category')

            // 2. Fetch All Coupons (Wallet Items)
            const { data: userCoupons } = await supabase
                .from('user_coupons')
                .select('status, coupon_id')

            // Calculate Funnel
            const claims = userCoupons?.filter(c => c.status === 'active').length || 0
            const redemptions = userCoupons?.filter(c => c.status === 'redeemed').length || 0
            const totalViews = billboards?.reduce((sum, b) => sum + (b.views || 0), 0) || 0
            const activeCount = billboards?.filter(b => b.is_active).length || 0

            // ROI: Redemptions / Views (Did they buy?)
            const conversion = totalViews > 0 ? ((redemptions / totalViews) * 100) : 0

            setMetrics({
                totalViews: totalViews,
                totalClaims: claims,
                totalRedemptions: redemptions,
                conversionRate: conversion.toFixed(1),
                activeCampaigns: activeCount
            })

            // --- ROI Insight Logic (Category Based) ---
            // Need to map coupons back to billboards to get category
            // Fetch coupon definitions
            const { data: couponDefs } = await supabase.from('coupons').select('id, billboard_id')

            const billboardRedemptions = {}
            userCoupons?.forEach(uc => {
                if (uc.status === 'redeemed') {
                    const def = couponDefs?.find(cd => cd.id === uc.coupon_id)
                    if (def?.billboard_id) {
                        billboardRedemptions[def.billboard_id] = (billboardRedemptions[def.billboard_id] || 0) + 1
                    }
                }
            })

            const categoryStats = {}
            billboards?.forEach(b => {
                if (!b.category) return
                if (!categoryStats[b.category]) categoryStats[b.category] = { views: 0, redemptions: 0 }

                categoryStats[b.category].views += (b.views || 0)
                categoryStats[b.category].redemptions += (billboardRedemptions[b.id] || 0)
            })

            const rois = Object.keys(categoryStats).map(cat => {
                const stats = categoryStats[cat]
                const roi = stats.views > 0 ? (stats.redemptions / stats.views) * 100 : 0
                return { category: cat, roi: roi }
            })
            rois.sort((a, b) => b.roi - a.roi)

            if (rois.length >= 2) {
                const best = rois[0]
                const tech = rois.find(r => r.category === 'Tech')
                const food = rois.find(r => r.category === 'Food')

                if (tech && food) {
                    const diff = (((tech.roi - food.roi) / food.roi || 1) * 100).toFixed(0)
                    if (diff > 0) setInsightText(`Your 'Tech' ads have a ${diff}% higher ROI than your 'Food' ads.`)
                    else setInsightText(`Your 'Food' ads have a ${Math.abs(diff)}% higher ROI than your 'Tech' ads.`)
                } else {
                    setInsightText(`Your '${best.category}' category is leading with ${best.roi.toFixed(1)}% ROI.`)
                }
            } else {
                setInsightText("Start more campaigns to unlock Category Insights.")
            }

            // --- Engagement Data (Mocked for Funnel Visualization) ---
            const mockTrend = [
                { name: 'Mon', views: 120, claims: 45, redemptions: 12 },
                { name: 'Tue', views: 140, claims: 55, redemptions: 18 },
                { name: 'Wed', views: 110, claims: 40, redemptions: 10 },
                { name: 'Thu', views: 160, claims: 70, redemptions: 25 },
                { name: 'Fri', views: 200, claims: 90, redemptions: 45 },
                { name: 'Sat', views: 240, claims: 110, redemptions: 60 },
                { name: 'Sun', views: 220, claims: 100, redemptions: 55 },
            ]
            setEngagementData(mockTrend)

            // --- Interests Data ---
            const categories = {}
            billboards?.forEach(b => {
                if (b.category) categories[b.category] = (categories[b.category] || 0) + 1
            })
            const pieData = Object.keys(categories).map(key => ({ name: key, value: categories[key] }))
            setInterestData(pieData)

        } catch (error) {
            console.error('Error loading dashboard:', error)
        } finally {
            setLoading(false)
        }
    }

    const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444']

    return (
        <div className="container">
            <header style={{ marginBottom: '2rem' }}>
                <h1 style={{ textShadow: '0 0 20px rgba(139, 92, 246, 0.3)' }}>Overview</h1>
                <p className="text-muted">Real-time AR performance metrics</p>
            </header>

            {/* KPI Cards: The Funnel */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
                <StatCard
                    title="Total Views"
                    value={metrics.totalViews.toLocaleString()}
                    icon={<Eye size={24} color="var(--accent)" />}
                    trend="Funnel Top"
                    tooltip="User scans the AR billboard."
                />
                <StatCard
                    title="Claims (Wallet)"
                    value={metrics.totalClaims.toLocaleString()}
                    icon={<Wallet size={24} color="var(--primary)" />}
                    trend="Funnel Middle"
                    tooltip="User saved the coupon to their wallet (Intent to Buy)."
                />
                <StatCard
                    title="Redemptions (Store)"
                    value={metrics.totalRedemptions.toLocaleString()}
                    icon={<Zap size={24} color="var(--warning)" />}
                    trend="Funnel Bottom"
                    tooltip="User visited the store and used the coupon (Actual Sale)."
                />
                <StatCard
                    title="Campaign ROI"
                    value={`${metrics.conversionRate}%`}
                    icon={<TrendingUp size={24} color="var(--success)" />}
                    trend="Global Conversion"
                    tooltip="Percentage of Views that turned into actual Store Redemptions."
                />
            </div>

            {/* Charts */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))', gap: '1.5rem' }}>

                {/* Line Chart: Full Funnel Engagement */}
                <div className="card" style={{ height: '400px', display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                        <h3>Engagement Funnel</h3>
                        <Activity size={20} className="text-muted" />
                    </div>

                    <div style={{ flex: 1, minHeight: 0 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={engagementData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="var(--text-muted)" />
                                <YAxis axisLine={false} tickLine={false} stroke="var(--text-muted)" />
                                <Tooltip
                                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }}
                                    itemStyle={{ color: 'var(--text)' }}
                                />
                                <Legend />
                                <Line type="monotone" dataKey="views" stroke="var(--text-muted)" strokeWidth={2} dot={{ r: 2 }} name="Views" />
                                <Line type="monotone" dataKey="claims" stroke="var(--primary)" strokeWidth={3} dot={{ r: 4 }} name="Claims" />
                                <Line type="monotone" dataKey="redemptions" stroke="var(--success)" strokeWidth={3} dot={{ r: 4 }} name="Sales" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(139, 92, 246, 0.1)', borderRadius: '8px', borderLeft: '3px solid var(--primary)', fontSize: '0.875rem' }}>
                        <span className="text-muted">✨ Insight: </span>
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                            {insightText || "Gathering funnel data..."}
                        </span>
                    </div>
                </div>

                {/* Pie Chart: Interests */}
                <div className="card" style={{ height: '400px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <h3>Audience Interests</h3>
                        <div className="text-muted text-sm">Personalization Filter</div>
                    </div>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={interestData}
                                cx="50%"
                                cy="50%"
                                innerRadius={80}
                                outerRadius={100}
                                paddingAngle={5}
                                dataKey="value"
                                stroke="none"
                            >
                                {interestData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                            </Pie>
                            <Tooltip contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: '8px' }} />
                            <Legend verticalAlign="middle" align="right" layout="vertical" />
                        </PieChart>
                    </ResponsiveContainer>
                </div>

            </div>
        </div>
    )
}

function StatCard({ title, value, icon, trend, tooltip }) {
    const [showTooltip, setShowTooltip] = useState(false)

    return (
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', position: 'relative' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <p className="text-muted text-sm" style={{ fontWeight: 500 }}>{title}</p>
                        {tooltip && (
                            <div
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                                style={{ cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                            >
                                <Info size={14} className="text-muted" />
                            </div>
                        )}
                    </div>
                    <h2 style={{ fontSize: '2rem', marginTop: '0.25rem' }}>{value}</h2>
                </div>
                <div style={{ padding: '0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
                    {icon}
                </div>
            </div>

            {/* Tooltip Popup */}
            {showTooltip && (
                <div style={{
                    position: 'absolute',
                    top: '-10px',
                    left: '50%',
                    transform: 'translate(-50%, -100%)',
                    background: '#334155',
                    color: '#fff',
                    padding: '0.5rem 0.75rem',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    width: '180px',
                    zIndex: 10,
                    boxShadow: '0 4px 6px rgba(0,0,0,0.3)',
                    pointerEvents: 'none'
                }}>
                    {tooltip}
                    <div style={{
                        position: 'absolute', bottom: '-4px', left: '50%', transform: 'translateX(-50%) rotate(45deg)',
                        width: '8px', height: '8px', background: '#334155'
                    }}></div>
                </div>
            )}

            <div className="text-sm" style={{ color: 'var(--text-muted)' }}>
                {trend}
            </div>
        </div>
    )
}
