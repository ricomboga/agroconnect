'use client'

import { useEffect, useState } from 'react'

const WORDS = ['Wakulima', 'Farmers', 'Wafugaji', 'Wakopeshaji', 'Wanunuzi']

export function AnimatedWords() {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setIndex((i) => (i + 1) % WORDS.length)
    }, 2200)
    return () => clearInterval(id)
  }, [])

  return (
    <span className="relative inline-grid h-[1.2em] overflow-hidden align-bottom">
      {WORDS.map((word, i) => (
        <span
          key={word}
          className="col-start-1 row-start-1 text-lime-300 transition-all duration-500 ease-out"
          style={{
            opacity: i === index ? 1 : 0,
            transform: i === index ? 'translateY(0)' : 'translateY(-100%)',
          }}
          aria-hidden={i !== index}
        >
          {word}
        </span>
      ))}
      <span className="invisible">{WORDS[0]}</span>
    </span>
  )
}
