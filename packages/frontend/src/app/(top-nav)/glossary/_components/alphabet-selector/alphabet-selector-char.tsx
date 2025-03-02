'use client'
import { type RefObject } from 'react'
import { cn } from '~/utils/cn'

interface CharProps {
  char: string
  href: string | undefined
  selected: boolean
  ref?: RefObject<HTMLLIElement | null>
}

export function AlphabetSelectorChar({ char, href, selected, ref }: CharProps) {
  return (
    <li ref={ref}>
      <a
        href={href}
        data-role="alphabet-selector-item"
        data-char={char.toLowerCase()}
        aria-disabled={!href}
        className={cn(
          'flex size-[34px] items-center justify-center rounded border transition ease-out',
          'border-gray-300 bg-pure-white dark:border-zinc-700 dark:bg-zinc-900',
          selected && 'border-brand bg-purple-300 dark:bg-neutral-700',
          href && !selected && 'hover:bg-gray-100 dark:hover:bg-zinc-800',
          !href &&
            'cursor-not-allowed border-gray-300 text-gray-400 dark:border-zinc-800 dark:text-zinc-500',
        )}
      >
        {char}
      </a>
    </li>
  )
}
