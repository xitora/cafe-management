"use client"

import { useEffect, useState, type ReactNode, Children, cloneElement, isValidElement } from "react"

interface StaggerListProps {
  children: ReactNode
  className?: string
  staggerDelay?: number
  initialDelay?: number
}

export function StaggerList({ 
  children, 
  className = "",
  staggerDelay = 50,
  initialDelay = 100 
}: StaggerListProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div className={className}>
      {Children.map(children, (child, index) => {
        if (!isValidElement(child)) return child
        
        return (
          <div
            key={index}
            className={`transition-all duration-300 ease-out ${
              isVisible 
                ? "opacity-100 translate-y-0" 
                : "opacity-0 translate-y-3"
            }`}
            style={{ 
              transitionDelay: `${initialDelay + index * staggerDelay}ms` 
            }}
          >
            {child}
          </div>
        )
      })}
    </div>
  )
}

interface StaggerItemProps {
  children: ReactNode
  index: number
  staggerDelay?: number
  initialDelay?: number
  className?: string
}

export function StaggerItem({ 
  children, 
  index, 
  staggerDelay = 50, 
  initialDelay = 100,
  className = ""
}: StaggerItemProps) {
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), initialDelay + index * staggerDelay)
    return () => clearTimeout(timer)
  }, [index, staggerDelay, initialDelay])

  return (
    <div
      className={`transition-all duration-300 ease-out ${
        isVisible 
          ? "opacity-100 translate-y-0 translate-x-0" 
          : "opacity-0 translate-y-2"
      } ${className}`}
    >
      {children}
    </div>
  )
}
