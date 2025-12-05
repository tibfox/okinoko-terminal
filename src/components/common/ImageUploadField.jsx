import React, { useState } from 'react'
import { playBeep } from '../../lib/beep.js'
import { uploadImageToHive } from '../../lib/uploadImageToHive.js'


export default function ImageUploadField({ paramName, user, params, setParams }) {
  const [uploading, setUploading] = useState(false)
  const [hasUploaded, setHasUploaded] = useState(false)

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    const valid = ['image/png', 'image/jpeg', 'image/gif', 'image/bmp']
    if (!valid.includes(file.type)) {
      alert('Only PNG, JPG, GIF, BMP supported.')
      return
    }

    try {
      setUploading(true)
      playBeep(440, 60, 'triangle')

      const url = await uploadImageToHive(file, user)
      setParams(prev => ({ ...prev, [paramName]: url }))

      playBeep(880, 80, 'square')
      setHasUploaded(true)
    } catch (err) {
      console.error('Upload error', err)
      alert(err.message || 'Image upload failed')
      playBeep(200, 300, 'sawtooth')
    } finally {
      setUploading(false)
      e.target.value = '' // allow re-selecting same file
    }
  }

  const imageUrl = params[paramName]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <input
        type="file"
        accept="image/png, image/jpeg, image/gif, image/bmp"
        disabled={uploading}
        onChange={handleFileChange}
        style={{ marginTop: '4px' }}
      />

      {/* --- Neon Flicker Preview --- */}
      {imageUrl && (
        <div
          className="image-upload-preview"
          style={{
            marginTop: '6px',
            border: '1px solid #0ff',
            
            padding: '4px',
            background: 'rgba(0, 255, 255, 0.05)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            maxWidth: '220px',
            opacity: hasUploaded ? 1 : 0,
            animation: hasUploaded
              ? 'flickerIn 1.6s ease-in-out forwards'
              : 'none',
          }}
        >
          <img
            src={imageUrl}
            alt="Preview"
            style={{
              maxWidth: '180px',
              maxHeight: '180px',
              objectFit: 'contain',
              
              filter: 'drop-shadow(0 0 6px #0ff)',
              animation: hasUploaded
                ? 'scanlinePulse 4s linear infinite'
                : 'none',
            }}
          />
          <a
            href={imageUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: '4px',
              color: '#0ff',
              fontSize: '0.75rem',
              wordBreak: 'break-all',
              textAlign: 'center',
            }}
          >
            {imageUrl.replace(/^https?:\/\//, '')}
          </a>
        </div>
      )}

      <style>{`
        @keyframes flickerIn {
          0% { opacity: 0; filter: brightness(0.4) blur(2px); }
          30% { opacity: 1; filter: brightness(2) blur(1px); }
          60% { opacity: 0.6; filter: brightness(1.2); }
          80% { opacity: 1; filter: brightness(1); }
          100% { opacity: 1; filter: brightness(1); }
        }

        @keyframes scanlinePulse {
          0% { opacity: 0.98; }
          50% { opacity: 0.90; }
          100% { opacity: 0.98; }
        }
      `}</style>
    </div>
  )
}
