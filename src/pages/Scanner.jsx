import { useState, useEffect } from 'react'
import { Scanner as QrScanner } from '@yudiel/react-qr-scanner'
import { Scan, CheckCircle, XCircle, Loader2 } from 'lucide-react'
import { supabase } from '../lib/supabase'

export default function Scanner() {
    const [scanResult, setScanResult] = useState(null)
    const [status, setStatus] = useState('idle') // idle, processing, success, error
    const [message, setMessage] = useState('')
    const [cameraaccess, setCameraAccess] = useState(false)

    useEffect(() => {
        // Simple permission check (browser handles valid prompt on mount)
        navigator.mediaDevices.getUserMedia({ video: true })
            .then(() => setCameraAccess(true))
            .catch(() => setCameraAccess(false))
    }, [])

    const handleScan = async (detectedCodes) => {
        if (detectedCodes && detectedCodes.length > 0 && status === 'idle') {
            const code = detectedCodes[0].rawValue
            processCode(code)
        }
    }

    const handleError = (err) => {
        console.error(err)
    }

    const processCode = async (code) => {
        setStatus('processing')
        try {
            // Assume QR Code contains the UUID of the user_coupon
            // Validation: Is it a valid UUID?
            const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-5][0-9a-f]{3}-[089ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
            if (!uuidRegex.test(code)) {
                throw new Error('Invalid QR Code format')
            }

            const { data, error } = await supabase.rpc('redeem_coupon', {
                target_user_coupon_id: code
            })

            if (error) throw error

            if (data.success) {
                setStatus('success')
                setMessage(data.message)
                // Reset after 3 seconds to scan next
                setTimeout(() => {
                    setStatus('idle')
                    setScanResult(null)
                    setMessage('')
                }, 3000)
            } else {
                throw new Error(data.error || 'Redemption failed')
            }

        } catch (error) {
            setStatus('error')
            setMessage(error.message)
            setTimeout(() => {
                setStatus('idle')
                setScanResult(null)
                setMessage('')
            }, 3000)
        }
    }

    const previewStyle = {
        height: 300,
        width: '100%',
        objectFit: 'cover',
        borderRadius: '12px'
    }

    return (
        <div className="container" style={{ maxWidth: '600px' }}>
            <header style={{ marginBottom: '2rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ padding: '0.75rem', background: 'var(--primary)', borderRadius: '12px' }}>
                        <Scan color="white" size={24} />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '1.5rem', margin: 0 }}>Coupon Scanner</h1>
                        <p className="text-muted">Verify and redeem customer codes</p>
                    </div>
                </div>
            </header>

            <div className="card" style={{ padding: '1rem', overflow: 'hidden', textAlign: 'center' }}>

                {/* Status Overlays */}
                {status === 'processing' && (
                    <div className="flex-center" style={{ padding: '2rem', flexDirection: 'column', gap: '1rem' }}>
                        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
                        <p>Verifying Coupon...</p>
                    </div>
                )}

                {status === 'success' && (
                    <div className="flex-center" style={{ padding: '2rem', flexDirection: 'column', gap: '1rem', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '8px' }}>
                        <CheckCircle size={64} postion="absolute" color="var(--success)" />
                        <h2 style={{ color: 'var(--success)' }}>Redeemed!</h2>
                        <p>{message}</p>
                    </div>
                )}

                {status === 'error' && (
                    <div className="flex-center" style={{ padding: '2rem', flexDirection: 'column', gap: '1rem', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px' }}>
                        <XCircle size={64} color="var(--danger)" />
                        <h2 style={{ color: 'var(--danger)' }}>Error</h2>
                        <p>{message}</p>
                    </div>
                )}

                {/* Camera View */}
                {status === 'idle' && (
                    <div style={{ position: 'relative', overflow: 'hidden', borderRadius: '12px', background: '#000', height: '300px' }}>
                        {cameraaccess ? (
                            <QrScanner
                                onScan={handleScan}
                                onError={handleError}
                                components={{ audio: false }}
                                styles={{ container: previewStyle }}
                            />
                        ) : (
                            <div className="flex-center" style={{ height: '300px', flexDirection: 'column', color: 'var(--text-muted)' }}>
                                <p>Camera access required.</p>
                                <p className="text-sm">Please allow camera permissions.</p>
                            </div>
                        )}
                        {/* Scanning Overlay Line */}
                        <div style={{
                            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
                            background: 'linear-gradient(180deg, rgba(0,0,0,0) 0%, rgba(139, 92, 246, 0.1) 50%, rgba(0,0,0,0) 100%)',
                            pointerEvents: 'none',
                            animation: 'scan 2s linear infinite',
                            zIndex: 10
                        }}></div>
                        <style>{`
                            @keyframes scan {
                                0% { transform: translateY(-100%); }
                                100% { transform: translateY(100%); }
                            }
                        `}</style>
                    </div>
                )}

                <div style={{ marginTop: '1.5rem', textAlign: 'left' }}>
                    <h3 style={{ fontSize: '1rem', marginBottom: '0.5rem' }}>Instructions</h3>
                    <ul className="text-muted text-sm" style={{ paddingLeft: '1.25rem' }}>
                        <li style={{ marginBottom: '0.25rem' }}>Ask customer to open "My Wallet" in the app.</li>
                        <li style={{ marginBottom: '0.25rem' }}>Point this camera at their QR Code.</li>
                        <li style={{ marginBottom: '0.25rem' }}>The system will automatically verify validity.</li>
                    </ul>
                </div>

            </div>
        </div >
    )
}
