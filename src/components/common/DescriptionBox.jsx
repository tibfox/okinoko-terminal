
import React from 'react'
import TypewriterText from '../animations/TypewriterText.jsx'


export default function DescriptionBox({ text, onDone,isMobile }) {
  if (!text) return null
  return (
    <div
      // className="description-box neon-scroll"
      className="description-box neon-scroll"
      // style={{width:  isMobile?'100%':'100%'}}
    >
      <TypewriterText text={text} onDone={onDone} />
      
    </div>
  )
}
