import type { AnchorHTMLAttributes, MouseEvent } from 'react'

import { navigateTo } from './navigation'

interface LinkProps extends Omit<AnchorHTMLAttributes<HTMLAnchorElement>, 'href'> {
  href: string
}

const ABSOLUTE_URL_PATTERN = /^[a-zA-Z][a-zA-Z\d+\-.]*:/

export default function Link({ href, onClick, target, ...props }: LinkProps) {
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event)
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      target === '_blank' ||
      event.metaKey ||
      event.altKey ||
      event.ctrlKey ||
      event.shiftKey ||
      ABSOLUTE_URL_PATTERN.test(href) ||
      href.startsWith('//')
    ) {
      return
    }

    event.preventDefault()
    navigateTo(href)
  }

  return <a href={href} onClick={handleClick} target={target} {...props} />
}
