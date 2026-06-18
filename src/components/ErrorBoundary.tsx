import { Component } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="card p-8 max-w-md text-center space-y-4">
            <div className="flex justify-center">
              <div className="p-3 rounded-full bg-red-500/10">
                <AlertTriangle size={32} className="text-red-400" />
              </div>
            </div>
            <h2 className="text-lg font-bold text-white">حدث خطأ غير متوقع</h2>
            <p className="text-sm text-dark-400">
              {this.state.error?.message || 'يرجى المحاولة مرة أخرى'}
            </p>
            <button onClick={this.handleRetry} className="btn-primary mx-auto">
              <RefreshCw size={16} /> إعادة المحاولة
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
