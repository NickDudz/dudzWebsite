"use client"

import React, { Component, ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
  onError?: (error: Error, errorInfo: ErrorInfo) => void
}

interface State {
  hasError: boolean
  error?: Error
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
    this.props.onError?.(error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="flex items-center justify-center p-4 text-center">
          <div className="rounded-md border border-red-500/50 bg-red-900/20 p-4 text-red-200">
            <h3 className="text-sm font-semibold">Canvas Error</h3>
            <p className="mt-1 text-xs text-red-300">
              The interactive background encountered an error and has been disabled.
            </p>
            <button
              onClick={() => this.setState({ hasError: false, error: undefined })}
              className="mt-2 rounded bg-red-600 px-3 py-1 text-xs text-white hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
