
import React from 'react'
import TypewriterText from '../animations/TypewriterText.jsx'


export default function DescriptionBox({ text, onDone,isMobile }) {
  if (!text) return null
  return (
    <div
      className="description-box"
      style={{width:  isMobile?'100%':'90%'}}
    >
      <TypewriterText text={text} onDone={onDone} />
      
    </div>
  )
}
