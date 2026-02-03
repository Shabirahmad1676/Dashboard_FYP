
import { useEffect, useState } from 'react'
import { MapPin, Eye, Trash2, Search, Plus, Upload, X, Loader2, Locate } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Billboards() {
    const [billboards, setBillboards] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [showModal, setShowModal] = useState(false)
    const [uploading, setUploading] = useState(false)

    // Form State
    const [form, setForm] = useState({
        title: '',
        business: '',
        category: 'Retail',
        city: 'Mardan',
        latitude: '',
        longitude: ''
    })
    const [imageFile, setImageFile] = useState(null)

    useEffect(() => {
        fetchBillboards()
    }, [])

    const fetchBillboards = async () => {
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        const { data, error } = await supabase
            .from('billboards')
            .select('*')
            .eq('owner_id', user.id) // Filter by owner
            .order('created_at', { ascending: false })

        if (!error) setBillboards(data || [])
        setLoading(false)
    }

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setImageFile(e.target.files[0])
        }
    }

    const handleGetLocation = () => {
        if (!navigator.geolocation) {
            return alert('Geolocation is not supported by your browser')
        }
        navigator.geolocation.getCurrentPosition(
            (position) => {
                setForm(prev => ({
                    ...prev,
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                }))
            },
            (error) => {
                alert('Unable to retrieve your location: ' + error.message)
            }
        )
    }

    const handleCreate = async (e) => {
        e.preventDefault()
        if (!imageFile) return alert('Please select an ad image')

        try {
            setUploading(true)
            const { data: { user } } = await supabase.auth.getUser()
            if (!user) throw new Error('You must be logged in')

            // 1. Upload Image
            const fileExt = imageFile.name.split('.').pop()
            const fileName = `${Math.random()}.${fileExt}`
            const filePath = `${fileName}`

            const { error: uploadError } = await supabase.storage
                .from('billboards')
                .upload(filePath, imageFile)

            if (uploadError) throw uploadError

            // 2. Get Public URL
            const { data: { publicUrl } } = supabase.storage
                .from('billboards')
                .getPublicUrl(filePath)

            // 3. Insert Record
            const { data, error: insertError } = await supabase
                .from('billboards')
                .insert([{
                    marker_id: `marker-${Date.now()}-${Math.floor(Math.random() * 1000)}`, // Auto-generate unique marker_id
                    title: form.title,
                    business: form.business,
                    category: form.category,
                    city: form.city,
                    latitude: form.latitude ? parseFloat(form.latitude) : null,
                    longitude: form.longitude ? parseFloat(form.longitude) : null,
                    image_url: publicUrl,
                    is_active: true,
                    views: 0,
                    owner_id: user.id // Assign ownership
                }])
                .select()

            if (insertError) throw insertError

            setBillboards([data[0], ...billboards])
            setShowModal(false)
            setForm({ title: '', business: '', category: 'Retail', city: 'Mardan', latitude: '', longitude: '' })
            setImageFile(null)
            alert('Billboard created successfully!')

        } catch (error) {
            console.error('Error creating billboard:', error.message)
            alert('Failed to create billboard: ' + error.message)
        } finally {
            setUploading(false)
        }
    }

    const handleDelete = async (id) => {
        if (!confirm('Are you sure? This action cannot be undone.')) return
        const { error } = await supabase.from('billboards').delete().eq('id', id)
        if (!error) setBillboards(billboards.filter(b => b.id !== id))
    }

    const filtered = billboards.filter(b =>
        b.title?.toLowerCase().includes(search.toLowerCase()) ||
        b.business?.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="container">
            <header style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ textShadow: '0 0 20px rgba(6, 182, 212, 0.3)' }}>My Ads</h1>
                    <p className="text-muted">Manage your AR campaigns</p>
                </div>
                <button className="btn btn-primary" onClick={() => setShowModal(true)}>
                    <Plus size={20} />
                    Create New Ad
                </button>
            </header>

            {/* Search Bar */}
            <div className="card" style={{ padding: '0.75rem 1rem', display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem', maxWidth: '400px' }}>
                <Search size={18} className="text-muted" />
                <input
                    type="text"
                    placeholder="Search campaigns..."
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ border: 'none', background: 'transparent', padding: 0 }}
                />
            </div>

            {loading ? (
                <div className="flex-center" style={{ height: '200px' }}><Loader2 className="animate-spin" /></div>
            ) : (
                <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid var(--border)' }}>
                            <tr>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Creative</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Details</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Location</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Performance</th>
                                <th style={{ padding: '1rem', textAlign: 'left' }}>Status</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map(item => (
                                <tr key={item.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ width: '60px', height: '60px', borderRadius: '8px', overflow: 'hidden', background: '#000' }}>
                                            <img src={item.image_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ fontWeight: 600 }}>{item.title}</div>
                                        <div className="text-muted text-sm">{item.business} • {item.category}</div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            <MapPin size={14} />
                                            {item.latitude && item.longitude ? (
                                                <span>{item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}</span>
                                            ) : (
                                                <span>{item.city}</span>
                                            )}
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <div className="flex-center" style={{ justifyContent: 'flex-start', gap: '0.5rem' }}>
                                            <Eye size={16} color="var(--accent)" />
                                            <span style={{ fontWeight: 600 }}>{item.views}</span>
                                        </div>
                                    </td>
                                    <td style={{ padding: '1rem' }}>
                                        <span style={{
                                            padding: '0.25rem 0.75rem',
                                            borderRadius: '99px',
                                            fontSize: '0.75rem',
                                            fontWeight: 600,
                                            background: item.is_active ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)',
                                            color: item.is_active ? 'var(--success)' : 'var(--danger)',
                                            border: `1px solid ${item.is_active ? 'var(--success)' : 'var(--danger)'}`
                                        }}>
                                            {item.is_active ? 'LIVE' : 'PAUSED'}
                                        </span>
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button className="btn" style={{ color: 'var(--danger)', padding: '0.5rem' }} onClick={() => handleDelete(item.id)}>
                                            <Trash2 size={18} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Create Modal */}
            {showModal && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.8)', zIndex: 50, overflowY: 'auto' }} className="flex-center">
                    <div className="card" style={{ width: '100%', maxWidth: '500px', background: '#1e293b', margin: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                            <h3>Create New Ad</h3>
                            <button onClick={() => setShowModal(false)} style={{ background: 'none', border: 'none', color: 'var(--text)' }}><X /></button>
                        </div>

                        <form onSubmit={handleCreate} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div>
                                <label className="text-sm text-muted">Campaign Title</label>
                                <input required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Summer Sale" />
                            </div>
                            <div>
                                <label className="text-sm text-muted">Business Name</label>
                                <input required value={form.business} onChange={e => setForm({ ...form, business: e.target.value })} placeholder="e.g. Nike Store" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="text-sm text-muted">Category</label>
                                    <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                                        <option>Retail</option>
                                        <option>Food</option>
                                        <option>Tech</option>
                                        <option>Fashion</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="text-sm text-muted">City</label>
                                    <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
                                </div>
                            </div>

                            {/* Lat/Long Inputs */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label className="text-sm text-muted">Latitude</label>
                                    <input required type="number" step="any" value={form.latitude} onChange={e => setForm({ ...form, latitude: e.target.value })} placeholder="34.198" />
                                </div>
                                <div>
                                    <label className="text-sm text-muted">Longitude</label>
                                    <input required type="number" step="any" value={form.longitude} onChange={e => setForm({ ...form, longitude: e.target.value })} placeholder="72.043" />
                                </div>
                            </div>

                            <button type="button" className="btn" style={{ background: 'rgba(255,255,255,0.05)', width: '100%' }} onClick={handleGetLocation}>
                                <Locate size={18} />
                                Get My Current Location
                            </button>

                            <div style={{ border: '2px dashed var(--border)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', background: 'rgba(0,0,0,0.2)' }} onClick={() => document.getElementById('fileUpload').click()}>
                                {imageFile ? (
                                    <div className="text-success">{imageFile.name}</div>
                                ) : (
                                    <>
                                        <Upload className="mx-auto text-muted" style={{ display: 'block', margin: '0 auto 0.5rem auto' }} />
                                        <span className="text-muted text-sm">Click to upload Ad Creative</span>
                                    </>
                                )}
                                <input id="fileUpload" type="file" accept="image/*" hidden onChange={handleFileChange} />
                            </div>

                            <button type="submit" className="btn btn-primary" disabled={uploading} style={{ justifyContent: 'center' }}>
                                {uploading ? <Loader2 className="animate-spin" /> : 'Launch Campaign'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
