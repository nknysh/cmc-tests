import { Component, type ReactNode } from 'react'
import { PageError } from './StatusView'

interface Props {
  children: ReactNode
  /** The current section; moving to another one clears the error. */
  resetKey: string
  onRetry: () => void
}

interface State {
  hasError: boolean
  resetKey: string
}

/**
 * Catches an error while drawing a section, so only the section is replaced by
 * an error message and the header and footer stay (APP-03/AC-9). React logs
 * the error to the console itself.
 */
export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, resetKey: props.resetKey }
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    return props.resetKey === state.resetKey ? null : { hasError: false, resetKey: props.resetKey }
  }

  static getDerivedStateFromError(): Partial<State> {
    return { hasError: true }
  }

  render() {
    return this.state.hasError ? <PageError onRetry={this.props.onRetry} /> : this.props.children
  }
}
